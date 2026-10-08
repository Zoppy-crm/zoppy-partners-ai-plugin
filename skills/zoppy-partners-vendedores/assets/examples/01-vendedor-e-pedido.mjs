#!/usr/bin/env node
// Exemplo: cadastrar um vendedor (telefone só em dígitos) e atribuir pedidos a ele por userId,
// seller.email e seller.phone, conferindo o vendedor gravado na leitura.
// Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
// O e-mail de um vendedor excluído não pode ser usado de novo: cada execução usa um e-mail novo.
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
        const phone = `11900082${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const { status } = await request('GET', `/customers/phone/${phone}`);
        if (status !== 200) return phone;
    }
    throw new Error('não achei telefone de teste livre');
}

const runId = `skills-test-zoppy-partners-vendedores-${Date.now()}`;
const created = { orders: [] };

async function main() {
    // 1. Vendedor com telefone só em dígitos (DDD + 9 + 8 dígitos, sem 55): é assim que o pedido o acha por telefone.
    const sellerPhone = `11900083${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const email = `skills-test+${Date.now()}@zoppy.com.br`;
    const seller = await zoppy('POST', '/users', { email, name: `${runId} vendedora`, phone: sellerPhone, password: 'Skills@123', revenueRecord: `${runId}-mat` });
    created.userId = seller.id;
    expectEqual('perfil do vendedor', seller.role, 'COMMON');

    // 2. E-mail repetido não cria outro vendedor.
    const again = await request('POST', '/users', { email: email.toUpperCase(), name: 'Outro', phone: sellerPhone, password: 'Skills@123' });
    expectEqual('e-mail repetido', again.status, 422);

    // 3. Pedidos atribuídos de quatro jeitos, e um sem correspondência.
    const phone = await freeTestPhone();
    const customer = await zoppy('POST', '/customers', {
        externalId: `${runId}-cliente`,
        firstName: 'Skills',
        lastName: 'Vendedores',
        phone,
        address: { address1: 'Rua Teste 1', city: 'Sao Paulo', state: 'SP', postcode: '01001000' }
    });
    expectEqual('cliente criado é o nosso', customer.externalId, `${runId}-cliente`);
    created.customerId = customer.id;
    const cases = [
        ['userId', { userId: seller.id }, seller.id],
        ['seller.email em maiúsculas', { seller: { email: email.toUpperCase() } }, seller.id],
        ['seller.phone com +55 e máscara', { seller: { phone: `+55 (${sellerPhone.slice(0, 2)}) ${sellerPhone.slice(2, 7)}-${sellerPhone.slice(7)}` } }, seller.id],
        ['seller.revenueRecord', { seller: { revenueRecord: `${runId}-mat` } }, seller.id],
        ['e-mail que não existe', { seller: { email: `nao-existe-${Date.now()}@zoppy.com.br` } }, null]
    ];
    for (const [label, sellerFields, expected] of cases) {
        const order = await zoppy('POST', '/orders', {
            externalId: `${runId}-${created.orders.length + 1}`,
            customerId: customer.id,
            status: 'on-hold',
            subtotal: 100,
            discount: 0,
            shipping: 0,
            createdAt: '2026-10-01T10:00:00-03:00',
            lineItems: [],
            ...sellerFields
        });
        created.orders.push(order.id);
        const back = await zoppy('GET', `/orders/${order.id}`);
        expectEqual(`vendedor do pedido (${label})`, back.userId, expected);
    }

    console.log(JSON.stringify({ ok: true, runId, userId: seller.id, pedidos: created.orders.length }));
}

async function cleanup() {
    for (const id of created.orders) await request('DELETE', `/orders/${id}`);
    if (created.customerId) await request('DELETE', `/customers/${created.customerId}`);
    // DELETE /users responde 200 com corpo vazio.
    if (created.userId) await request('DELETE', `/users/${created.userId}`);
}

try {
    await main();
} catch (cause) {
    console.error(cause.message);
    process.exitCode = 1;
} finally {
    await cleanup();
}
