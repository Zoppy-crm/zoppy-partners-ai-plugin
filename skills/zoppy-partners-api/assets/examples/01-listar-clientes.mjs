#!/usr/bin/env node
// @ts-check
// Exemplo: autenticar, listar uma página de clientes, conferir o formato paginado e percorrer
// todas as páginas sem duplicar. Só lê dados. Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e
// ZOPPY_PARTNERS_BASE_URL.
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
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (response.status === 403 && !isJson) throw new Error(`${method} ${path} respondeu 403 na borda: confira o header zoppy-access`);
    const data = text && isJson ? JSON.parse(text) : text;
    if (!response.ok) throw new Error(`${method} ${path} respondeu ${response.status}: ${text}`);
    return data;
}

/**
 * @param {string} label
 * @param {unknown} condition
 * @param {string} detail
 */
function expect(label, condition, detail) {
    if (!condition) throw new Error(`${label}: ${detail}`);
}

/**
 * @typedef {{ page: number, pageSize: number, totalRecords: number, totalPages: number }} Pagination
 * @typedef {{ pagination: Pagination, data: Array<{ id: unknown }> }} Page
 */

/**
 * @param {string} label
 * @param {Page} body
 * @param {number} page
 * @param {number} pageSize
 */
function checkPage(label, body, page, pageSize) {
    const pagination = body?.pagination;
    expect(label, pagination && Array.isArray(body.data), `esperado { pagination, data[] }, veio ${JSON.stringify(body).slice(0, 200)}`);
    expect(label, pagination.page === page, `pagination.page esperado ${page}, veio ${pagination.page}`);
    expect(label, pagination.pageSize === pageSize, `pagination.pageSize esperado ${pageSize}, veio ${pagination.pageSize}`);
    expect(label, Number.isInteger(pagination.totalRecords), `totalRecords não é inteiro: ${pagination.totalRecords}`);
    const expectedPages = Math.ceil(pagination.totalRecords / pageSize);
    expect(label, pagination.totalPages === expectedPages, `totalPages esperado ${expectedPages}, veio ${pagination.totalPages}`);
    expect(label, body.data.length <= pageSize, `${body.data.length} itens numa página de ${pageSize}`);
    for (const item of body.data) expect(label, typeof item.id === 'string', `item sem id: ${JSON.stringify(item).slice(0, 120)}`);
}

// Data antiga e com fuso: traz todos os clientes criados a partir dela.
const AFTER = '2020-01-01T00:00:00-03:00';
const PAGE_SIZE = 50;

// 1. Uma página, conferindo o formato.
/** @type {(page: number) => URLSearchParams} */
const query = (page) => new URLSearchParams({ after: AFTER, page: String(page), pageSize: String(PAGE_SIZE) });
const first = await zoppy('GET', `/customers?${query(1)}`);
checkPage('página 1', first, 1, PAGE_SIZE);

// 2. Todas as páginas, juntando por id (a ordem dos itens não é por data).
const byId = new Map(first.data.map((/** @type {{ id: unknown }} */ customer) => [customer.id, customer]));
for (let page = 2; page <= first.pagination.totalPages; page++) {
    const body = await zoppy('GET', `/customers?${query(page)}`);
    checkPage(`página ${page}`, body, page, PAGE_SIZE);
    for (const customer of body.data) byId.set(customer.id, customer);
}

// 3. Página além da última volta vazia, sem erro.
const beyond = await zoppy('GET', `/customers?${query(first.pagination.totalPages + 1)}`);
expect('página além da última', Array.isArray(beyond.data) && beyond.data.length === 0, `esperado data [], veio ${beyond.data?.length} itens`);

console.log(JSON.stringify({ ok: true, totalRecords: first.pagination.totalRecords, totalPages: first.pagination.totalPages, clientesLidos: byId.size }));
