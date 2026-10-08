#!/usr/bin/env node
// Exemplo: cadastrar na Zoppy um cupom individual que você já criou no seu sistema, ler de volta e excluir.
// Pré-requisito: um cliente com o mesmo telefone (é ele que aparece em "customer" na consulta).
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
    if (status < 200 || status > 299) throw new Error(`${method} ${path} respondeu ${status}: ${text}`);
    return data;
}

function expectEqual(label, actual, expected) {
    if (actual !== expected) throw new Error(`${label}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}

// Telefone de teste ainda sem cliente na conta (faixa fictícia 1190000xxxx).
async function freePhone() {
    for (let attempt = 0; attempt < 20; attempt++) {
        const phone = `119000040${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`.slice(0, 11);
        const { status } = await request('GET', `/customers/phone/${phone}`);
        if (status !== 200) return phone;
    }
    throw new Error('nenhum telefone de teste livre');
}

const runId = `skills-test-zoppy-partners-cupons-webhooks-${Date.now()}`;
const code = `SKTCW${Date.now()}`;
let customerId;
let couponId;

try {
    // 1. Pré-requisito: cliente com telefone (veja a skill zoppy-partners-clientes)
    const phone = await freePhone();
    const customer = await zoppy('POST', '/customers', {
        externalId: `${runId}-cliente`,
        firstName: runId,
        lastName: 'Cupom',
        phone,
        email: 'skills-test+1@example.com',
        address: { address1: 'Rua Teste 1', city: 'Sao Paulo', state: 'SP', postcode: '01001000' }
    });
    customerId = customer.id;

    // 2. Cadastrar o cupom com todos os campos que têm padrão escondido
    const created = await zoppy('POST', '/coupons', {
        externalId: `${runId}-cupom`,
        code,
        phone,
        type: 'fixed_cart',
        amount: 20,
        minPurchaseValue: 100,
        expiryDate: '2027-12-31T23:59:59-03:00',
        awaitingOrder: false
    });
    couponId = created.id;

    // 3. Ler de volta pelo código e pelo externalId
    const byCode = await zoppy('GET', `/coupons/code/${code}`);
    expectEqual('id', byCode.id, couponId);
    expectEqual('amount', byCode.amount, 20);
    expectEqual('minPurchaseValue', byCode.minPurchaseValue, 100);
    expectEqual('type', byCode.type, 'fixed_cart');
    expectEqual('used', byCode.used, false);
    expectEqual('isValid', byCode.isValid, true);
    expectEqual('acumulative', byCode.acumulative, true);
    expectEqual('expiryDate', byCode.expiryDate, '2028-01-01T02:59:59.000Z');
    expectEqual('customer.id', byCode.customer?.id, customerId);
    const byExternal = await zoppy('GET', `/coupons/external/${runId}-cupom`);
    expectEqual('busca por externalId', byExternal.id, couponId);

    // 4. Excluir: a resposta é uma lista com o cupom; a remoção termina em segundo plano
    const deleted = await zoppy('DELETE', `/coupons/${couponId}`);
    expectEqual('DELETE devolve o cupom', deleted[0]?.id, couponId);
    couponId = undefined;

    console.log(JSON.stringify({ ok: true, runId, code }));
} finally {
    if (couponId) await request('DELETE', `/coupons/${couponId}`);
    if (customerId) await request('DELETE', `/customers/${customerId}`);
}
