#!/usr/bin/env node
// Exemplo: cadastrar as filiais sem duplicar (reaproveitando a loja que já existe pelo código) e mandar
// um pedido para cada filial por storeId, conferindo a loja gravada na leitura.
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

async function freeTestPhone() {
    for (let attempt = 0; attempt < 20; attempt++) {
        const phone = `11900080${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const { status } = await request('GET', `/customers/phone/${phone}`);
        if (status !== 200) return phone;
    }
    throw new Error('não achei telefone de teste livre');
}

// Todas as lojas ativas da conta, de todas as páginas (inclusive as criadas por outras integrações).
async function listAllStores() {
    const stores = [];
    let page = 1;
    let totalPages = 1;
    do {
        const result = await zoppy('GET', `/stores?after=2020-01-01T00:00:00-03:00&page=${page}&pageSize=50`);
        stores.push(...result.data);
        totalPages = result.pagination.totalPages;
        page++;
    } while (page <= totalPages);
    return stores;
}

// Devolve filial -> storeId. Reaproveita a loja que já tem o código da filial como externalId
// (a API compara sem diferenciar maiúsculas) e cria só as que faltam. Filiais cadastradas por outra
// integração com outro código entram em `confirmedMap`, que o usuário confirma par a par.
async function syncBranches(branches, confirmedMap = {}) {
    const byExternalId = new Map((await listAllStores()).filter((store) => store.externalId).map((store) => [store.externalId.toLowerCase(), store]));
    const result = {};
    for (const branch of branches) {
        if (confirmedMap[branch.code]) {
            result[branch.code] = { storeId: confirmedMap[branch.code], reused: true };
            continue;
        }
        const existing = byExternalId.get(branch.code.toLowerCase());
        if (existing) {
            result[branch.code] = { storeId: existing.id, reused: true };
            continue;
        }
        const created = await zoppy('POST', '/stores', { externalId: branch.code, name: branch.name, isEcommerce: false });
        result[branch.code] = { storeId: created.id, reused: false };
    }
    return result;
}

const runId = `skills-test-zoppy-partners-lojas-${Date.now()}`;
const created = { stores: new Set(), orders: [] };

async function main() {
    const branches = [
        { code: `${runId}-01`, name: `${runId} LJ CENTRO` },
        { code: `${runId}-02`, name: `${runId} LJ BAIRRO` },
        { code: `${runId}-03`, name: `${runId} LJ SHOPPING` }
    ];

    // 1. A filial 01 já existe na conta (cadastrada antes, por você ou por uma rodada anterior).
    const existing = await zoppy('POST', '/stores', { externalId: branches[0].code, name: branches[0].name, isEcommerce: false });
    created.stores.add(existing.id);

    // 2. Sincroniza: reaproveita a 01 e cria a 02 e a 03. Rodar de novo não cria nada.
    const first = await syncBranches(branches);
    Object.values(first).forEach(({ storeId }) => created.stores.add(storeId));
    expectEqual('filial 01 reaproveitada', first[branches[0].code].storeId, existing.id);
    expectEqual('filial 01 não criada de novo', first[branches[0].code].reused, true);
    const second = await syncBranches(branches);
    for (const branch of branches) expectEqual(`segunda rodada, ${branch.code}`, second[branch.code].storeId, first[branch.code].storeId);
    const ours = (await listAllStores()).filter((store) => store.name.startsWith(runId));
    expectEqual('lojas do teste na conta', ours.length, 3);

    // 3. Um pedido por filial, sempre por storeId, e a loja conferida na leitura.
    const phone = await freeTestPhone();
    const customer = await zoppy('POST', '/customers', {
        externalId: `${runId}-cliente`,
        firstName: 'Skills',
        lastName: 'Lojas',
        phone,
        address: { address1: 'Rua Teste 1', city: 'Sao Paulo', state: 'SP', postcode: '01001000' }
    });
    expectEqual('cliente criado é o nosso', customer.externalId, `${runId}-cliente`);
    created.customerId = customer.id;
    for (const branch of branches) {
        const storeId = first[branch.code].storeId;
        const order = await zoppy('POST', '/orders', {
            externalId: `${branch.code}-pedido`,
            customerId: customer.id,
            storeId,
            status: 'on-hold',
            subtotal: 100,
            discount: 0,
            shipping: 0,
            createdAt: '2026-10-01T10:00:00-03:00',
            lineItems: []
        });
        created.orders.push(order.id);
        const back = await zoppy('GET', `/orders/${order.id}`);
        expectEqual(`loja do pedido da filial ${branch.code}`, back.storeId, storeId);
    }

    console.log(JSON.stringify({ ok: true, runId, lojas: Object.fromEntries(Object.entries(first).map(([code, value]) => [code, value.storeId])) }));
}

async function cleanup() {
    for (const id of created.orders) await request('DELETE', `/orders/${id}`);
    for (const id of created.stores) await request('DELETE', `/stores/${id}`);
    if (created.customerId) await request('DELETE', `/customers/${created.customerId}`);
}

try {
    await main();
} catch (cause) {
    console.error(cause.message);
    process.exitCode = 1;
} finally {
    await cleanup();
}
