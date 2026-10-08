#!/usr/bin/env node
// @ts-check
// Exemplo: vincular produto a um item de pedido. O productId do item é o id da Zoppy (UUID), não o externalId.
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
    if (status >= 400) throw new Error(`${method} ${path} respondeu ${status}: ${text}`);
    return data;
}

/**
 * @param {string} label
 * @param {unknown} actual
 * @param {unknown} expected
 */
function expectEqual(label, actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}

// Telefone fictício livre: o cadastro de cliente reaproveita cliente com o mesmo telefone.
async function freeTestPhone() {
    for (let attempt = 0; attempt < 20; attempt++) {
        const phone = `1190000${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        const found = await request('GET', `/customers/phone/${phone}`);
        if (found.status >= 400) return phone;
    }
    throw new Error('não achei telefone de teste livre');
}

const runId = `skills-test-zoppy-partners-produtos-${Date.now()}`;
/** @type {{ customerId: string | undefined, productId: string | undefined, orderId: string | undefined }} */
const created = { customerId: undefined, productId: undefined, orderId: undefined };

try {
    // 1. Pré-requisitos: cliente e produto.
    const phone = await freeTestPhone();
    const customer = await zoppy('POST', '/customers', {
        externalId: `${runId}-cliente`,
        firstName: 'Skills',
        lastName: 'Produtos',
        phone,
        email: `skills-test+${phone.slice(-4)}@example.com`,
        address: { address1: 'Rua Teste 1', city: 'Sao Paulo', state: 'SP', postcode: '01001000' }
    });
    expectEqual('cliente criado é o nosso', customer.externalId, `${runId}-cliente`);
    created.customerId = customer.id;

    const product = await zoppy('POST', '/products', { externalId: `${runId}-sku`, name: `${runId} Caneca`, status: 'publish', price: 50 });
    created.productId = product.id;

    // 2. Pedido com dois itens: um pelo id da Zoppy (certo) e outro pelo externalId (errado).
    const order = await zoppy('POST', '/orders', {
        externalId: `${runId}-pedido`,
        customerId: customer.id,
        status: 'on-hold',
        subtotal: 150,
        discount: 0,
        shipping: 0,
        createdAt: '2026-10-07T10:00:00-03:00',
        lineItems: [
            { productId: product.id, quantity: 2 },
            { productId: `${runId}-sku`, quantity: 1 }
        ]
    });
    created.orderId = order.id;

    // 3. A API responde 200, mas só grava o item cujo productId é o UUID de um produto ativo.
    expectEqual('itens gravados', order.lineItems.length, 1);
    expectEqual('productId do item', order.lineItems[0].productId, product.id);
    expectEqual('quantidade do item', order.lineItems[0].quantity, 2);

    const readBack = await zoppy('GET', `/orders/${order.id}`);
    expectEqual('itens lidos de volta', readBack.lineItems.map((/** @type {{ productId: string, quantity: number }} */ item) => [item.productId, item.quantity]), [[product.id, 2]]);
    expectEqual('preço exibido no item é o do produto', readBack.lineItems[0].product.price, 50);

    // 4. Produto excluído some dos itens na leitura do pedido.
    await zoppy('DELETE', `/products/${product.id}`);
    created.productId = undefined;
    const afterDelete = await zoppy('GET', `/orders/${order.id}`);
    expectEqual('itens depois de excluir o produto', afterDelete.lineItems, []);

    console.log(JSON.stringify({ ok: true, runId, pedido: order.id, itensGravados: order.lineItems.length }));
} finally {
    if (created.orderId) await request('DELETE', `/orders/${created.orderId}`);
    if (created.productId) await request('DELETE', `/products/${created.productId}`);
    if (created.customerId) await request('DELETE', `/customers/${created.customerId}`);
}
