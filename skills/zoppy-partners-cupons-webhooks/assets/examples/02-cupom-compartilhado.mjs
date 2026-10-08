#!/usr/bin/env node
// @ts-check
// Exemplo: cadastrar um cupom compartilhado (sem cliente, com limite de uso), ler de volta e excluir.
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
async function zoppy(method, path, body) {
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
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${path} respondeu ${response.status}: ${text}`);
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

const now = Date.now();
const runId = `skills-test-zoppy-partners-cupons-webhooks-${now}`;
const code = `SKTCWSH${now}`;
// No compartilhado o externalId é um inteiro de 0 a 2147483647. Texto ou UUID vira 0 sem erro.
const externalId = Math.floor(now / 1000) % 2_000_000_000;
/** @type {{ id: string } | undefined} */
let created;

try {
    created = /** @type {{ id: string }} */ (await zoppy('POST', '/coupons/shared', {
        externalId,
        code,
        type: 'fixed_cart',
        amount: 20,
        minPurchaseValue: 100,
        usageLimit: 500,
        expiryDate: '2027-12-31T23:59:59-03:00'
    }));

    const byCode = await zoppy('GET', `/coupons/code/${code}`);
    expectEqual('id', byCode.id, created.id);
    expectEqual('externalId', byCode.externalId, externalId);
    expectEqual('usageLimit', byCode.usageLimit, 500);
    expectEqual('amount', byCode.amount, 20);
    expectEqual('minPurchaseValue', byCode.minPurchaseValue, 100);
    expectEqual('isValid', byCode.isValid, true);
    expectEqual('sem cliente', byCode.customer, undefined);

    // Excluir pelo código (DELETE por externalId não acha cupom compartilhado)
    const deleted = await zoppy('DELETE', `/coupons/code/${code}`);
    expectEqual('DELETE devolve o cupom', deleted[0]?.id, created.id);
    created = undefined;

    console.log(JSON.stringify({ ok: true, runId, code, externalId }));
} finally {
    if (created) await zoppy('DELETE', `/coupons/code/${code}`).catch(() => undefined);
}
