#!/usr/bin/env node
// @ts-check
// Exemplo: corrigir em lote os pedidos que caíram na loja padrão "Integrador Externo".
// Lista os pedidos do período, separa os da loja padrão, lê cada um e reenvia o pedido INTEIRO por PUT
// com o storeId certo, conferindo que só a loja mudou.
// Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
const missing = ['ZOPPY_PARTNERS_TOKEN', 'ZOPPY_ACCESS', 'ZOPPY_PARTNERS_BASE_URL'].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Defina as variáveis de ambiente: ${missing.join(', ')}`);
    process.exit(2);
}

const BASE_URL = process.env.ZOPPY_PARTNERS_BASE_URL;
const DEFAULT_STORE_NAME = 'Integrador Externo';

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

/** @type {(value: number) => number} */
const cents = (value) => Math.round(value * 100);
/** @type {(ms: number) => Promise<void>} */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function freeTestPhone() {
    for (let attempt = 0; attempt < 20; attempt++) {
        const phone = `11900081${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const { status } = await request('GET', `/customers/phone/${phone}`);
        if (status === 422) return phone; // 422 Customer not found: telefone livre
        if (status !== 200) throw new Error(`GET /customers/phone respondeu ${status}`);
    }
    throw new Error('não achei telefone de teste livre');
}

/** @param {string} path */
async function listAll(path) {
    const items = [];
    let page = 1;
    let totalPages = 1;
    do {
        const result = await zoppy('GET', `${path}&page=${page}&pageSize=50`);
        items.push(...result.data);
        totalPages = result.pagination.totalPages;
        page++;
    } while (page <= totalPages);
    return items;
}

/**
 * Pedido como a API devolve na leitura (só os campos usados aqui).
 * @typedef {object} Order
 * @property {string} status
 * @property {number} subtotal
 * @property {number} discount
 * @property {number} shipping
 * @property {number} total
 * @property {string} createdAt
 * @property {string | null} [completedAt]
 * @property {string | null} [couponCode]
 * @property {string | null} [userId]
 * @property {string | null} [provider]
 * @property {Array<{ productId: string, quantity: number }>} lineItems
 */

// O PUT é reenvio completo: monta o corpo a partir da leitura, trocando só a loja.
// Sem couponCode (ausente mantém o cupom), sem vendedor e sem provider (ausentes, mantêm).
/**
 * @param {Order} order
 * @param {string} storeId
 */
function buildStoreFix(order, storeId) {
    /** @type {Omit<Order, 'total' | 'completedAt' | 'couponCode' | 'userId' | 'provider'> & { storeId: string, completedAt?: string }} */
    const body = {
        status: order.status,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        createdAt: order.createdAt,
        lineItems: order.lineItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        storeId
    };
    if (order.status === 'completed' && order.completedAt) body.completedAt = order.completedAt;
    return body;
}

/** @param {Order} order */
function snapshot(order) {
    const items = order.lineItems.map((item) => `${item.productId}x${item.quantity}`).sort().join(',');
    return { total: cents(order.total), status: order.status, createdAt: order.createdAt, completedAt: order.completedAt, couponCode: order.couponCode, userId: order.userId, provider: order.provider, items };
}

/**
 * @param {string} orderId
 * @param {string} storeId
 */
async function fixOrderStore(orderId, storeId) {
    const before = await zoppy('GET', `/orders/${orderId}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
        await zoppy('PUT', `/orders/${orderId}`, buildStoreFix(before, storeId));
        await sleep(5000);
        const after = await zoppy('GET', `/orders/${orderId}`);
        if (after.storeId !== storeId) continue;
        expectEqual(`pedido ${orderId} sem outra mudança`, JSON.stringify(snapshot(after)), JSON.stringify(snapshot(before)));
        return { orderId, from: before.storeId, to: storeId };
    }
    throw new Error(`pedido ${orderId}: a loja não mudou depois de 3 tentativas`);
}

const runId = `skills-test-zoppy-partners-lojas-${Date.now()}`;
/** @type {{ orders: string[], storeId?: string, customerId?: string, productId?: string }} */
const created = { orders: [] };

async function main() {
    // 1. Pré-requisitos: filial, cliente, produto e um pedido enviado sem loja (cai na loja padrão).
    const branch = await zoppy('POST', '/stores', { externalId: `${runId}-filial`, name: `${runId} LJ CENTRO`, isEcommerce: false });
    created.storeId = branch.id;
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
    const product = await zoppy('POST', '/products', { externalId: `${runId}-sku`, name: `${runId}-produto`, status: 'publish', price: 65.8 });
    created.productId = product.id;
    const saleDate = new Date().toISOString();
    const wrong = await zoppy('POST', '/orders', {
        externalId: `${runId}-pedido`,
        customerId: customer.id,
        status: 'completed',
        subtotal: 151.6,
        discount: 7.58,
        shipping: 20,
        couponCode: `${runId}-CUPOM-DO-ERP`.toUpperCase(),
        provider: 'erp-exemplo',
        createdAt: saleDate,
        completedAt: saleDate,
        lineItems: [{ productId: product.id, quantity: 2 }]
    });
    created.orders.push(wrong.id);

    // 2. Loja padrão e pedidos do período que caíram nela (aqui, só os deste teste).
    const stores = await listAll('/stores?after=2020-01-01T00:00:00-03:00');
    const defaultStore = stores.find((store) => store.name === DEFAULT_STORE_NAME);
    if (!defaultStore) throw new Error('a conta não tem a loja padrão');
    expectEqual('pedido sem loja foi para a loja padrão', wrong.storeId, defaultStore.id);
    await sleep(5000);
    const periodStart = new Date(Date.parse(saleDate) - 60_000).toISOString();
    const orders = await listAll(`/orders?after=${encodeURIComponent(periodStart)}`);
    // A loja padrão é de todas as integrações da conta: só mexa em pedido que existe no SEU sistema.
    // Aqui, o "seu sistema" é este mapa externalId -> storeId da filial.
    const branchByExternalId = new Map([[`${runId}-pedido`, branch.id]]);
    const toFix = orders.filter((order) => order.storeId === defaultStore.id && branchByExternalId.has(order.externalId));
    expectEqual('pedidos na loja padrão', toFix.length, 1);

    // 3. Corrige um por um, com a filial que o seu sistema diz para cada externalId.
    /** @type {(externalId: string) => string} */
    const branchOf = (externalId) => branchByExternalId.get(externalId);
    const report = [];
    for (const order of toFix) report.push(await fixOrderStore(order.id, branchOf(order.externalId)));

    const back = await zoppy('GET', `/orders/${wrong.id}`);
    expectEqual('loja corrigida', back.storeId, branch.id);
    expectEqual('total mantido', cents(back.total), cents(151.6 - 7.58 - 20));
    expectEqual('cupom mantido', back.couponCode, `${runId}-CUPOM-DO-ERP`.toUpperCase());
    console.log(JSON.stringify({ ok: true, runId, corrigidos: report }));
}

async function cleanup() {
    for (const id of created.orders) {
        // Pedido completed pode gerar cupom pelas automações da conta: apague-o também.
        const generated = await request('GET', `/coupons/order/${id}`);
        if (generated.status === 200 && generated.data?.id) await request('DELETE', `/coupons/${generated.data.id}`);
        await request('DELETE', `/orders/${id}`);
    }
    if (created.productId) await request('DELETE', `/products/${created.productId}`);
    if (created.customerId) await request('DELETE', `/customers/${created.customerId}`);
    if (created.storeId) await request('DELETE', `/stores/${created.storeId}`);
}

try {
    await main();
} catch (cause) {
    console.error(/** @type {Error} */ (cause).message);
    process.exitCode = 1;
} finally {
    await cleanup();
}
