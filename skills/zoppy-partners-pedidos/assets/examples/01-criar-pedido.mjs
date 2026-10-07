#!/usr/bin/env node
// Exemplo: criar pedido com frete e desconto e conferir o total gravado.
// Itens 131,60 + frete 20 - desconto 7,58: subtotal 151,60 (com frete), total gravado 124,02 (sem frete).
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

// A Zoppy grava valores com ponto flutuante: compare em centavos.
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
const created = {};

async function main() {
    // 1. Pré-requisitos: cliente e produto. O pedido usa os ids da Zoppy, não os seus externalId.
    const phone = await freeTestPhone();
    const customer = await zoppy('POST', '/customers', {
        externalId: `${runId}-cliente`,
        firstName: 'Skills',
        lastName: 'Pedidos',
        phone,
        email: `skills-test+${phone.slice(-4)}@zoppy.com.br`,
        address: { address1: 'Rua Teste 1', city: 'Sao Paulo', state: 'SP', postcode: '01001000' }
    });
    expectEqual('cliente criado é o nosso', customer.externalId, `${runId}-cliente`);
    created.customerId = customer.id;
    const product = await zoppy('POST', '/products', { externalId: `${runId}-sku`, name: `${runId}-marmita`, status: 'publish', price: 65.8 });
    created.productId = product.id;

    // 2. Pedido: vendido em 05/09, pago em 09/09. subtotal = itens + frete; não existe campo total.
    const items = 131.6;
    const shipping = 20;
    const discount = 7.58;
    const order = await zoppy('POST', '/orders', {
        externalId: `${runId}-pedido`,
        customerId: customer.id,
        status: 'completed',
        subtotal: items + shipping,
        discount,
        shipping,
        createdAt: '2026-09-05T10:26:00-03:00',
        completedAt: '2026-09-09T14:00:00-03:00',
        lineItems: [{ productId: product.id, quantity: 2 }]
    });
    created.orderId = order.id;

    // 3. Ler de volta pelo id e pelo externalId e conferir.
    const byId = await zoppy('GET', `/orders/${order.id}`);
    const byExternalId = await zoppy('GET', `/orders/external/${encodeURIComponent(`${runId}-pedido`)}`);
    expectEqual('mesmo pedido pelo externalId', byExternalId.id, order.id);
    expectEqual('total gravado (itens com desconto, sem frete)', cents(byId.total), cents(items - discount));
    expectEqual('subtotal devolvido (total + discount + shipping)', cents(byId.subtotal), cents(items + shipping));
    expectEqual('createdAt é a data da venda', byId.createdAt, '2026-09-05T13:26:00.000Z');
    expectEqual('completedAt é a data do pagamento', byId.completedAt, '2026-09-09T17:00:00.000Z');
    expectEqual('itens', byId.lineItems.map((item) => `${item.productId}:${item.quantity}`).join(','), `${product.id}:2`);
    expectEqual('cliente do pedido', byId.customer.id, customer.id);

    // 4. Mesmo externalId de novo: 422, não cria outro pedido.
    const repeated = await request('POST', '/orders', {
        externalId: `${runId}-pedido`,
        customerId: customer.id,
        status: 'completed',
        subtotal: items + shipping,
        discount,
        shipping,
        createdAt: '2026-09-05T10:26:00-03:00'
    });
    expectEqual('externalId repetido', `${repeated.status} ${repeated.data?.message}`, '422 External id already exists');

    console.log(JSON.stringify({ ok: true, runId, pedido: order.id, total: byId.total, subtotal: byId.subtotal }));
}

async function cleanup() {
    if (created.orderId) await request('DELETE', `/orders/${created.orderId}`);
    if (created.productId) await request('DELETE', `/products/${created.productId}`);
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
