#!/usr/bin/env node
// @ts-check
// Exemplo: criar cliente, buscar por externalId, atualizar, conferir e excluir.
// Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
const missing = ['ZOPPY_PARTNERS_TOKEN', 'ZOPPY_ACCESS', 'ZOPPY_PARTNERS_BASE_URL'].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Defina as variáveis de ambiente: ${missing.join(', ')}`);
    process.exit(2);
}

const BASE_URL = process.env.ZOPPY_PARTNERS_BASE_URL;

/**
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 */
async function request(method, path, body) {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.ZOPPY_PARTNERS_TOKEN}`,
            'zoppy-access': /** @type {string} */ (process.env.ZOPPY_ACCESS),
            'Content-Type': 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null, text };
}

/**
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 */
async function zoppy(method, path, body) {
    const { status, data, text } = await request(method, path, body);
    if (status < 200 || status >= 300) throw new Error(`${method} ${path} respondeu ${status}: ${text}`);
    return data;
}

/**
 * @param {string} label
 * @param {unknown} actual
 * @param {unknown} expected
 */
function expectEqual(label, actual, expected) {
    if (actual !== expected) throw new Error(`${label}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}

// O POST deduplica por telefone: se o número já existir, devolve o cliente antigo.
// Por isso o exemplo procura um telefone de teste livre antes de criar.
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
/** @type {string | undefined} */
let customerId;

try {
    // 1. Criar. Telefone com máscara e 55: a API grava só DDD + número.
    const created = await zoppy('POST', '/customers', {
        externalId: runId,
        email: 'skills-test+1@example.com',
        phone: `+55 (${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`,
        firstName: 'maria',
        lastName: 'DA silva',
        birthDate: '1990-05-15',
        gender: 'f',
        address: { address1: 'Rua das Flores, 123', address2: 'Apto 42', city: 'São Paulo', state: 'SP', postcode: '01001-000', country: 'BR' }
    });
    customerId = created.id;
    expectEqual('externalId criado', created.externalId, runId);
    expectEqual('telefone normalizado', created.phone, phone);
    expectEqual('nome formatado', `${created.firstName} ${created.lastName}`, 'Maria Da Silva');
    expectEqual('gênero em maiúscula', created.gender, 'F');
    expectEqual('CEP só com dígitos', created.address.postcode, '01001000');

    // 2. Buscar por externalId e conferir o que foi gravado.
    const found = await zoppy('GET', `/customers/external/${encodeURIComponent(runId)}`);
    expectEqual('busca por externalId', found.id, customerId);
    expectEqual('data de nascimento', found.birthDate, '1990-05-15T00:00:00.000Z');

    // 3. Atualizar. O PUT exige phone, firstName, lastName e address; o que for omitido
    //    entre email, birthDate, gender, externalId, address2 e country fica como estava.
    await zoppy('PUT', `/customers/${customerId}`, {
        phone,
        firstName: 'Maria',
        lastName: 'Souza',
        address: { address1: 'Rua Nova, 456', city: 'Campinas', state: 'SP', postcode: '13010-000', latitude: -22.9, longitude: -47.06 }
    });

    // 4. Ler de volta com GET (a resposta do PUT pode trazer updatedAt anterior).
    const updated = await zoppy('GET', `/customers/${customerId}`);
    expectEqual('sobrenome atualizado', updated.lastName, 'Souza');
    expectEqual('cidade atualizada', updated.address.city, 'Campinas');
    expectEqual('latitude gravada no PUT', updated.address.latitude, -22.9);
    expectEqual('e-mail mantido', updated.email, 'skills-test+1@example.com');
    expectEqual('complemento mantido', updated.address.address2, 'Apto 42');
    expectEqual('gênero mantido', updated.gender, 'F');

    // 5. Excluir e conferir que a busca não acha mais.
    const deleted = await zoppy('DELETE', `/customers/${customerId}`);
    expectEqual('exclusão', deleted.result, true);
    const after = await request('GET', `/customers/${customerId}`);
    expectEqual('busca depois de excluir', after.status, 422);
    customerId = undefined;

    console.log(JSON.stringify({ ok: true, runId, phone }));
} finally {
    if (customerId) await request('DELETE', `/customers/${customerId}`);
}
