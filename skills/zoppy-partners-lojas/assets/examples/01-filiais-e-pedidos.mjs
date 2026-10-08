#!/usr/bin/env node
// Exemplo: cadastrar as filiais sem duplicar. Reaproveita sozinho só o mapa salvo da própria integração;
// loja existente com o mesmo código ou nome vira lista "a confirmar" com o usuário, e nada é criado antes
// disso. Depois manda um pedido por filial por storeId e confere a loja gravada na leitura.
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
        if (status === 422) return phone; // 422 Customer not found: telefone livre
        if (status !== 200) throw new Error(`GET /customers/phone respondeu ${status}`);
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

// Compara como a API: sem diferenciar maiúsculas e acentos (espaços contam).
const fold = (text) => (text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// savedMap: filial -> storeId que a SUA integração já guardou (ou que o usuário confirmou).
// Reaproveita sozinho só o que está nesse mapa. Loja existente com o mesmo código ou o mesmo nome
// de uma filial fora do mapa vai para `toConfirm` e nada é criado: códigos de sistemas diferentes são
// independentes, e só o usuário sabe se é a mesma filial. Sem candidata, a filial é criada.
async function syncBranches(branches, savedMap = {}) {
    const stores = await listAllStores();
    const activeIds = new Set(stores.map((store) => store.id));
    const result = {};
    const toConfirm = [];
    const toCreate = [];
    for (const branch of branches) {
        const saved = savedMap[branch.code];
        if (saved && activeIds.has(saved)) {
            result[branch.code] = saved;
            continue;
        }
        const candidates = stores.filter((store) => fold(store.externalId) === fold(branch.code) || fold(store.name) === fold(branch.name));
        if (candidates.length) toConfirm.push({ branch, candidates: candidates.map(({ id, externalId, name }) => ({ id, externalId, name })) });
        else toCreate.push(branch);
    }
    if (toConfirm.length) return { toConfirm, map: null, created: [] };
    const created = [];
    for (const branch of toCreate) {
        const store = await zoppy('POST', '/stores', { externalId: branch.code, name: branch.name, isEcommerce: false });
        result[branch.code] = store.id;
        created.push(store.id);
    }
    return { toConfirm: [], map: result, created };
}

const runId = `skills-test-zoppy-partners-lojas-${Date.now()}`;
const created = { stores: new Set(), orders: [] };

async function main() {
    const branches = [
        { code: `${runId}-01`, name: `${runId} LJ CENTRO` },
        { code: `${runId}-02`, name: `${runId} LJ Sao Paulo` },
        { code: `${runId}-03`, name: `${runId} LJ SHOPPING` }
    ];

    // 1. Outra integração da conta já cadastrou duas lojas: uma com o mesmo código da filial 01 (em
    //    maiúsculas) e outra com o nome da filial 02 escrito com acento.
    const otherA = await zoppy('POST', '/stores', { externalId: `${runId}-01`.toUpperCase(), name: `${runId} FILIAL 1 DO OUTRO SISTEMA`, isEcommerce: false });
    const otherB = await zoppy('POST', '/stores', { externalId: `${runId}-outro-77`, name: `${runId} LJ São Paulo`, isEcommerce: false });
    created.stores.add(otherA.id);
    created.stores.add(otherB.id);

    // 2. Primeira sincronização, sem mapa salvo: não cria nada e devolve a lista a confirmar.
    const first = await syncBranches(branches);
    expectEqual('filiais a confirmar', first.toConfirm.map(({ branch }) => branch.code).join(','), `${runId}-01,${runId}-02`);
    expectEqual('nada criado antes da confirmação', first.created.length, 0);

    // 3. O usuário confirma os pares (aqui, simulado). O mapa confirmado é salvo pela sua integração.
    const confirmed = { [`${runId}-01`]: otherA.id, [`${runId}-02`]: otherB.id };
    const second = await syncBranches(branches, confirmed);
    second.created.forEach((id) => created.stores.add(id));
    expectEqual('só a filial 03 criada', second.created.length, 1);
    const savedMap = second.map;

    // 4. Rodar de novo com o mapa salvo não cria nada.
    const third = await syncBranches(branches, savedMap);
    expectEqual('terceira rodada sem criar', third.created.length, 0);
    const ours = (await listAllStores()).filter((store) => store.name.startsWith(runId));
    expectEqual('lojas do teste na conta', ours.length, 3);
    const otherAfter = await zoppy('GET', `/stores/${otherA.id}`);
    expectEqual('loja do outro sistema não renomeada', otherAfter.name, `${runId} FILIAL 1 DO OUTRO SISTEMA`);

    // 5. Um pedido por filial, sempre por storeId, e a loja conferida na leitura.
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
        const storeId = savedMap[branch.code];
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

    console.log(JSON.stringify({ ok: true, runId, lojas: savedMap }));
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
