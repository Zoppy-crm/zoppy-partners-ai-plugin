#!/usr/bin/env node
// @ts-check
// Exemplo: listar carrinhos abandonados com paginação e filtro de data, achando o carrinho recém-criado.
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
/** @type {{ cartId: string | null, customerId: string | null }} */
const created = { cartId: null, customerId: null };

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

/** @param {string} createdAt */
async function createCart(createdAt) {
    const customer = await createCustomer('Listagem');
    const cart = await zoppy('POST', '/abandoned-carts', {
        externalId: `${runId}-carrinho`,
        customerId: customer.id,
        subtotal: 60,
        discount: 0,
        shipping: 0,
        url: `https://loja.exemplo.com.br/carrinho/${runId}`,
        createdAt
    });
    created.cartId = cart.id;
}

/** @param {string} after */
async function findInList(after) {
    // after filtra pela data de criação do carrinho (createdAt >= after). pageSize vai de 1 a 50.
    for (let page = 1; page <= 20; page += 1) {
        const query = new URLSearchParams({ after, page: String(page), pageSize: '50' });
        const result = await zoppy('GET', `/abandoned-carts?${query}`);
        const found = result.data.find((/** @type {{ id: string }} */ cart) => cart.id === created.cartId);
        if (found) return { found, pagination: result.pagination };
        if (page >= result.pagination.totalPages) break;
    }
    throw new Error(`carrinho ${created.cartId} não apareceu na listagem com after=${after}`);
}

async function checkPageSizeLimit() {
    const tooBig = await request('GET', '/abandoned-carts?after=2026-01-01&page=1&pageSize=51');
    expectEqual('pageSize 51: status', tooBig.status, 422);
}

try {
    // A data é gravada em segundos inteiros; sem milissegundos o filtro after bate com o valor gravado.
    const createdAt = new Date(Math.floor((Date.now() - 60_000) / 1000) * 1000).toISOString();
    await createCart(createdAt);
    const { found, pagination } = await findInList(createdAt);
    expectEqual('externalId na listagem', found.externalId, `${runId}-carrinho`);
    expectEqual('total na listagem', found.total, 60);
    if (typeof pagination.totalRecords !== 'number') throw new Error('pagination.totalRecords ausente');
    await checkPageSizeLimit();
    console.log(JSON.stringify({ ok: true, runId, pagination }));
} finally {
    if (created.cartId) await request('DELETE', `/abandoned-carts/${created.cartId}`);
    if (created.customerId) await request('DELETE', `/customers/${created.customerId}`);
}
