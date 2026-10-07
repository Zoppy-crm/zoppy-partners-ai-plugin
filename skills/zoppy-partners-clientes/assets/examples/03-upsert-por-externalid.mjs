#!/usr/bin/env node
// Exemplo: sincronizar cliente sem duplicar (upsert por externalId, tratando telefone já cadastrado).
// Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
const missing = ['ZOPPY_PARTNERS_TOKEN', 'ZOPPY_ACCESS', 'ZOPPY_PARTNERS_BASE_URL'].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Defina as variáveis de ambiente: ${missing.join(', ')}`);
    process.exit(2);
}

const BASE_URL = process.env.ZOPPY_PARTNERS_BASE_URL;

async function request(method, path, body) {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.ZOPPY_PARTNERS_TOKEN}`,
            'zoppy-access': process.env.ZOPPY_ACCESS,
            'Content-Type': 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null, text };
}

async function zoppy(method, path, body) {
    const { status, data, text } = await request(method, path, body);
    if (status < 200 || status >= 300) throw new Error(`${method} ${path} respondeu ${status}: ${text}`);
    return data;
}

function expectEqual(label, actual, expected) {
    if (actual !== expected) throw new Error(`${label}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}

// Upsert recomendado:
// 1. GET /customers/external/{externalId}. Achou: PUT /customers/{id}.
// 2. Não achou (422): POST /customers.
// 3. Se o POST devolver outro externalId, o telefone já era de um cliente existente e o POST
//    não gravou nada do que você mandou. Faça PUT nesse id para atualizar e ligar o seu externalId.
async function upsertCustomer(payload) {
    const existing = await request('GET', `/customers/external/${encodeURIComponent(payload.externalId)}`);
    if (existing.status === 200) return zoppy('PUT', `/customers/${existing.data.id}`, payload);
    if (existing.status !== 422) throw new Error(`busca por externalId respondeu ${existing.status}: ${existing.text}`);

    const created = await zoppy('POST', '/customers', payload);
    if (created.externalId === payload.externalId) return created;
    return zoppy('PUT', `/customers/${created.id}`, payload);
}

async function freeTestPhone() {
    for (let attempt = 0; attempt < 20; attempt++) {
        const phone = `1190000${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        const { status } = await request('GET', `/customers/phone/${phone}`);
        if (status === 422) return phone;
    }
    throw new Error('não achei telefone de teste livre');
}

const runId = `skills-test-zoppy-partners-clientes-${Date.now()}`;
const phone = await freeTestPhone();
const address = { address1: 'Rua C, 30', city: 'Curitiba', state: 'PR', postcode: '80010-000' };
const created = [];

try {
    // Cliente que já existe na Zoppy com este telefone (por exemplo, veio de outra integração).
    const original = await zoppy('POST', '/customers', { externalId: `${runId}-antigo`, phone, firstName: 'Nome', lastName: 'Antigo', address });
    created.push(original.id);

    // POST direto com o mesmo telefone e outro externalId: devolve o cliente antigo, sem mudar nada.
    const duplicatePost = await zoppy('POST', '/customers', { externalId: `${runId}-novo`, phone: `55${phone}`, firstName: 'Nome', lastName: 'Novo', address });
    expectEqual('POST com telefone repetido devolve o mesmo id', duplicatePost.id, original.id);
    expectEqual('POST com telefone repetido não troca o externalId', duplicatePost.externalId, `${runId}-antigo`);
    expectEqual('POST com telefone repetido não troca o nome', duplicatePost.lastName, 'Antigo');

    // Upsert: liga o novo externalId ao cliente existente e atualiza os dados.
    await upsertCustomer({ externalId: `${runId}-novo`, phone, firstName: 'Nome', lastName: 'Novo', address });
    const linked = await zoppy('GET', `/customers/external/${encodeURIComponent(`${runId}-novo`)}`);
    expectEqual('upsert usa o cliente existente', linked.id, original.id);
    expectEqual('upsert atualiza o nome', linked.lastName, 'Novo');

    // Segunda chamada do upsert com o mesmo externalId cai no PUT, sem criar outro cliente.
    await upsertCustomer({ externalId: `${runId}-novo`, phone, firstName: 'Nome', lastName: 'Novo Dois', address });
    const again = await zoppy('GET', `/customers/phone/${phone}`);
    expectEqual('reenvio não cria outro cliente', again.id, original.id);
    expectEqual('reenvio atualiza', again.lastName, 'Novo Dois');

    console.log(JSON.stringify({ ok: true, runId, phone, customerId: original.id }));
} finally {
    for (const id of created) await request('DELETE', `/customers/${id}`);
}
