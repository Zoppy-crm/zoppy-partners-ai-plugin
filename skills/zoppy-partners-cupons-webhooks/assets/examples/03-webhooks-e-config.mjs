#!/usr/bin/env node
// Exemplo: listar os webhooks cadastrados e ler a configuração de cupom (giftback) da conta. Só leitura.
// Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
const missing = ['ZOPPY_PARTNERS_TOKEN', 'ZOPPY_ACCESS', 'ZOPPY_PARTNERS_BASE_URL'].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Defina as variáveis de ambiente: ${missing.join(', ')}`);
    process.exit(2);
}

const BASE_URL = process.env.ZOPPY_PARTNERS_BASE_URL;

async function zoppy(method, path) {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${process.env.ZOPPY_PARTNERS_TOKEN}`, 'zoppy-access': process.env.ZOPPY_ACCESS }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path} respondeu ${response.status}: ${text}`);
    return text ? JSON.parse(text) : null;
}

const webhooks = await zoppy('GET', '/webhooks');
if (!Array.isArray(webhooks)) throw new Error(`GET /webhooks: esperado uma lista, veio ${JSON.stringify(webhooks)}`);
for (const webhook of webhooks) {
    if (webhook.event !== 'coupon_create') throw new Error(`evento inesperado: ${webhook.event}`);
}

const config = await zoppy('GET', '/coupons-config');
for (const field of ['id', 'companyId', 'percentValue', 'expirationDays', 'acumulative', 'enableGiftback']) {
    if (!(field in config)) throw new Error(`GET /coupons-config sem o campo ${field}`);
}

console.log(
    JSON.stringify({
        ok: true,
        webhooks: webhooks.map(({ id, event, url }) => ({ id, event, url })),
        giftback: { percentValue: config.percentValue, expirationDays: config.expirationDays, acumulative: config.acumulative }
    })
);
