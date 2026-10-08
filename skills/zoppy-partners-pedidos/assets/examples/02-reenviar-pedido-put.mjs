#!/usr/bin/env node
// @ts-check
// Exemplo: PUT como reenvio. O PUT recalcula o total e substitui itens; reenvie o pedido inteiro,
// sempre com createdAt (sem ele, um PUT com completedAt troca a data do pedido pela do pagamento).
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

// A Zoppy grava valores com ponto flutuante: compare em centavos.
/** @type {(value: number) => number} */
const cents = (value) => Math.round(value * 100);

async function freeTestPhone() {
    for (let attempt = 0; attempt < 20; attempt++) {
        const phone = `11900002${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const { status } = await request('GET', `/customers/phone/${phone}`);
        if (status !== 200) return phone;
    }
    throw new Error('não achei telefone de teste livre');
}

const runId = `skills-test-zoppy-partners-pedidos-${Date.now()}`;
/** @type {{ customerId?: string, productId?: string, orderId?: string }} */
const created = {};

async function main() {
    // 1. Pré-requisitos: cliente, produto e pedido aguardando pagamento.
    const phone = await freeTestPhone();
    const customer = await zoppy('POST', '/customers', {
        externalId: `${runId}-cliente`,
        firstName: 'Skills',
        lastName: 'Pedidos',
        phone,
        email: `skills-test+${phone.slice(-4)}@example.com`,
        address: { address1: 'Rua Teste 1', city: 'Sao Paulo', state: 'SP', postcode: '01001000' }
    });
    expectEqual('cliente criado é o nosso', customer.externalId, `${runId}-cliente`);
    created.customerId = customer.id;
    const product = await zoppy('POST', '/products', { externalId: `${runId}-sku`, name: `${runId}-marmita`, status: 'publish', price: 50 });
    created.productId = product.id;
    const saleDate = '2026-09-05T10:26:00-03:00';
    const order = await zoppy('POST', '/orders', {
        externalId: `${runId}-pedido`,
        customerId: customer.id,
        status: 'on-hold',
        subtotal: 115,
        discount: 10,
        shipping: 15,
        createdAt: saleDate,
        lineItems: [{ productId: product.id, quantity: 2 }]
    });
    created.orderId = order.id;
    expectEqual('total do on-hold', cents(order.total), cents(115 - 10 - 15));
    expectEqual('completedAt vazio fora de completed', order.completedAt, null);

    // 2. Reenvio completo: pago em 09/09 com frete maior. Mesmo createdAt, mesmos itens.
    //    Um PUT logo depois do POST pode ser sobrescrito pelo processamento do POST:
    //    espere, leia de volta e reenvie se o pedido não refletir o PUT.
    const putBody = {
        status: 'completed',
        subtotal: 120,
        discount: 10,
        shipping: 20,
        createdAt: saleDate,
        completedAt: '2026-09-09T14:00:00-03:00',
        lineItems: [{ productId: product.id, quantity: 2 }]
    };
    let back = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        const updated = await zoppy('PUT', `/orders/${order.id}`, putBody);
        expectEqual('status do PUT', updated.status, 'completed');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        back = await zoppy('GET', `/orders/${order.id}`);
        if (back.status === 'completed' && cents(back.shipping) === cents(20)) break;
        console.error(`PUT não refletido na leitura (tentativa ${attempt}); reenviando`);
    }

    // 3. Conferir: total recalculado, data da venda mantida, itens presentes.
    expectEqual('total recalculado', cents(back.total), cents(120 - 10 - 20));
    expectEqual('subtotal devolvido', cents(back.subtotal), cents(120));
    expectEqual('createdAt mantido', back.createdAt, '2026-09-05T13:26:00.000Z');
    expectEqual('completedAt gravado', back.completedAt, '2026-09-09T17:00:00.000Z');
    expectEqual('itens mantidos', back.lineItems.length, 1);
    expectEqual('externalId não muda', back.externalId, `${runId}-pedido`);

    console.log(JSON.stringify({ ok: true, runId, pedido: order.id, total: back.total, createdAt: back.createdAt }));
}

async function cleanup() {
    if (created.orderId) await request('DELETE', `/orders/${created.orderId}`);
    if (created.productId) await request('DELETE', `/products/${created.productId}`);
    if (created.customerId) await request('DELETE', `/customers/${created.customerId}`);
}

try {
    await main();
} catch (cause) {
    console.error(/** @type {Error} */ (cause).message);
    process.exitCode = 1;
} finally {
    await cleanup();
}
