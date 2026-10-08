#!/usr/bin/env node
// @ts-check
// Exemplo: ciclo do carrinho abandonado (criar, buscar, atualizar, excluir), conferindo cada leitura de volta.
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
    return { status: response.status, text, data: text ? JSON.parse(text) : null };
}

/**
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 */
async function zoppy(method, path, body) {
    const { status, text, data } = await request(method, path, body);
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

const runId = `skills-test-zoppy-partners-carrinho-abandonado-${Date.now()}`;
let phone = '';
/** @type {{ cartId: string | null, customerId: string | null, productId: string | null }} */
const created = { cartId: null, customerId: null, productId: null };

async function freePhone() {
    // A criação de cliente reaproveita o cliente que já tem o mesmo telefone: escolha um telefone livre.
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = `11900003${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const found = await request('GET', `/customers/phone/${candidate}`);
        if (found.status === 422 || found.status === 404) return candidate;
    }
    throw new Error('nenhum telefone livre encontrado na faixa 11900003000 a 11900003999');
}

/** @param {string} lastName */
async function createCustomer(lastName) {
    phone = await freePhone();
    const customer = await zoppy('POST', '/customers', {
        externalId: `${runId}-cliente`,
        firstName: 'Teste',
        lastName,
        phone,
        email: `skills-test+${phone.slice(-4)}@example.com`,
        address: { address1: 'Rua Exemplo 1', city: 'Sao Paulo', state: 'SP', postcode: '01001000' }
    });
    if (customer.externalId !== `${runId}-cliente`) throw new Error(`o telefone ${phone} caiu no cliente ${customer.id}, que não é deste exemplo`);
    created.customerId = customer.id;
    return customer;
}

async function createPrerequisites() {
    await createCustomer('Carrinho');
    const product = await zoppy('POST', '/products', { externalId: `${runId}-produto`, name: `${runId} produto`, price: 50, status: 'publish' });
    created.productId = product.id;
}

async function createCart() {
    // Produtos 100 + frete 20 = subtotal 120; desconto 10. Total gravado = 120 - 10 - 20 = 90.
    const cart = await zoppy('POST', '/abandoned-carts', {
        externalId: `${runId}-carrinho`,
        customerId: created.customerId,
        subtotal: 120,
        discount: 10,
        shipping: 20,
        url: `https://loja.exemplo.com.br/carrinho/${runId}`,
        lineItems: [{ productId: created.productId, quantity: 2 }],
        createdAt: '2026-10-01T10:00:00-03:00'
    });
    created.cartId = cart.id;
    return cart;
}

/**
 * Carrinho como a API devolve na leitura (só os campos conferidos aqui).
 * @typedef {{ total: number, discount: number, subtotal: number, shipping: number, createdAt: string, lineItems: Array<{ productId: string }>, customer: { id: string } }} AbandonedCart
 */

/** @param {AbandonedCart} cart */
function checkCreated(cart) {
    expectEqual('total gravado', cart.total, 90);
    expectEqual('discount', cart.discount, 10);
    expectEqual('subtotal lido (total + discount)', cart.subtotal, 100);
    expectEqual('shipping lido', cart.shipping, 0);
    expectEqual('createdAt em UTC', cart.createdAt, '2026-10-01T13:00:00.000Z');
    expectEqual('quantidade de itens', cart.lineItems.length, 1);
    expectEqual('produto do item', cart.lineItems[0].productId, created.productId);
    expectEqual('cliente', cart.customer.id, created.customerId);
}

/** @param {number} expectedTotal */
async function readBack(expectedTotal) {
    const byId = await zoppy('GET', `/abandoned-carts/${created.cartId}`);
    expectEqual('GET por id: total', byId.total, expectedTotal);
    const byExternal = await zoppy('GET', `/abandoned-carts/external/${runId}-carrinho`);
    expectEqual('GET por externalId: id', byExternal.id, created.cartId);
    return byId;
}

async function checkDuplicateExternalId() {
    const duplicate = await request('POST', '/abandoned-carts', {
        externalId: `${runId}-carrinho`,
        customerId: created.customerId,
        subtotal: 1,
        discount: 0,
        shipping: 0,
        url: 'https://loja.exemplo.com.br/x'
    });
    expectEqual('externalId repetido: status', duplicate.status, 422);
    expectEqual('externalId repetido: mensagem', duplicate.data.message, 'External id already exists');
}

async function updateCart() {
    // PUT substitui tudo: valores, URL e a lista inteira de itens.
    await zoppy('PUT', `/abandoned-carts/${created.cartId}`, {
        subtotal: 170,
        discount: 0,
        shipping: 20,
        url: `https://loja.exemplo.com.br/carrinho/${runId}-v2`,
        lineItems: [{ productId: created.productId, quantity: 3 }]
    });
    const cart = await readBack(150);
    expectEqual('url atualizada', cart.url, `https://loja.exemplo.com.br/carrinho/${runId}-v2`);
    expectEqual('quantidade atualizada', cart.lineItems[0].quantity, 3);
    expectEqual('createdAt mantido', cart.createdAt, '2026-10-01T13:00:00.000Z');
    expectEqual('externalId mantido', cart.externalId, `${runId}-carrinho`);
}

async function deleteCart() {
    const result = await zoppy('DELETE', `/abandoned-carts/${created.cartId}`);
    expectEqual('DELETE result', result.result, true);
    const after = await request('GET', `/abandoned-carts/${created.cartId}`);
    expectEqual('GET depois do DELETE', after.status, 404);
    created.cartId = null;
}

async function cleanup() {
    if (created.cartId) await request('DELETE', `/abandoned-carts/${created.cartId}`);
    if (created.productId) await request('DELETE', `/products/${created.productId}`);
    if (created.customerId) await request('DELETE', `/customers/${created.customerId}`);
}

try {
    await createPrerequisites();
    checkCreated(await createCart());
    await readBack(90);
    await checkDuplicateExternalId();
    await updateCart();
    await deleteCart();
    console.log(JSON.stringify({ ok: true, runId }));
} finally {
    await cleanup();
}
