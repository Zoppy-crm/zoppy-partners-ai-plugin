#!/usr/bin/env node
// Exemplo: o que a API responde quando falta um header ou um parâmetro obrigatório.
// 1. sem zoppy-access: 403 com página HTML (borda), não JSON
// 2. sem Authorization: 401 JSON "Authorization header authorization not found"
// 3. listagem sem after: 422 JSON "Invalid after date"
// Só lê dados. Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
const missing = ['ZOPPY_PARTNERS_TOKEN', 'ZOPPY_ACCESS', 'ZOPPY_PARTNERS_BASE_URL'].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Defina as variáveis de ambiente: ${missing.join(', ')}`);
    process.exit(2);
}

const BASE_URL = process.env.ZOPPY_PARTNERS_BASE_URL;
const LIST = '/customers?after=2020-01-01T00%3A00%3A00-03%3A00&page=1&pageSize=1';
const AUTHORIZATION = `Bearer ${process.env.ZOPPY_PARTNERS_TOKEN}`;

async function raw(path, headers) {
    const response = await fetch(`${BASE_URL}${path}`, { headers });
    return { status: response.status, contentType: response.headers.get('content-type') ?? '', text: await response.text() };
}

function expectEqual(label, actual, expected) {
    if (actual !== expected) throw new Error(`${label}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}

// 1. Sem zoppy-access.
const noAccess = await raw(LIST, { Authorization: AUTHORIZATION });
expectEqual('sem zoppy-access: status', noAccess.status, 403);
expectEqual('sem zoppy-access: corpo é HTML', noAccess.contentType.includes('text/html'), true);

// 2. Sem Authorization.
const noToken = await raw(LIST, { 'zoppy-access': process.env.ZOPPY_ACCESS });
expectEqual('sem Authorization: status', noToken.status, 401);
expectEqual('sem Authorization: message', JSON.parse(noToken.text).message, 'Authorization header authorization not found');

// 3. Credenciais certas, listagem sem after.
const noAfter = await raw('/customers?page=1&pageSize=1', { Authorization: AUTHORIZATION, 'zoppy-access': process.env.ZOPPY_ACCESS });
expectEqual('sem after: status', noAfter.status, 422);
expectEqual('sem after: message', JSON.parse(noAfter.text).message, 'Invalid after date');

console.log(JSON.stringify({ ok: true, semZoppyAccess: noAccess.status, semAuthorization: noToken.status, semAfter: noAfter.status }));
