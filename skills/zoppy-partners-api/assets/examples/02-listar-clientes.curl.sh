#!/usr/bin/env bash
# Exemplo em curl: autenticar, listar uma página de clientes e conferir o formato paginado.
# Só lê dados. Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
# Usa node só para ler o JSON.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

# after com fuso; os dois-pontos vão codificados como %3A.
AFTER='2020-01-01T00%3A00%3A00-03%3A00'
PAGE_SIZE=2

BODY=$(curl -sS --fail-with-body \
    "$ZOPPY_PARTNERS_BASE_URL/customers?after=$AFTER&page=1&pageSize=$PAGE_SIZE" \
    -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" \
    -H "zoppy-access: $ZOPPY_ACCESS" \
    -H 'Content-Type: application/json')

printf '%s' "$BODY" | node -e '
const body = JSON.parse(require("fs").readFileSync(0, "utf8"));
const pageSize = Number(process.argv[1]);
const fail = (msg) => { console.error(msg); process.exit(1); };
const p = body.pagination;
if (!p || !Array.isArray(body.data)) fail(`esperado { pagination, data[] }, veio ${JSON.stringify(body).slice(0, 200)}`);
if (p.page !== 1) fail(`pagination.page esperado 1, veio ${p.page}`);
if (p.pageSize !== pageSize) fail(`pagination.pageSize esperado ${pageSize}, veio ${p.pageSize}`);
if (p.totalPages !== Math.ceil(p.totalRecords / pageSize)) fail(`totalPages ${p.totalPages} não bate com totalRecords ${p.totalRecords}`);
if (body.data.length > pageSize) fail(`${body.data.length} itens numa página de ${pageSize}`);
console.log(JSON.stringify({ ok: true, totalRecords: p.totalRecords, totalPages: p.totalPages, itensNaPagina: body.data.length }));
' "$PAGE_SIZE"
