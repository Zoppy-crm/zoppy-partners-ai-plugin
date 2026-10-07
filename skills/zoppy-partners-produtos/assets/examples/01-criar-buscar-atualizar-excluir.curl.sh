#!/usr/bin/env bash
# Exemplo: criar, buscar, atualizar e excluir um produto com curl, conferindo cada leitura de volta.
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL. Usa node só para ler campos do JSON.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

RUN_ID="skills-test-zoppy-partners-produtos-$(date +%s%N)"
PRODUCT_ID=""

zoppy() {
    curl -sS --fail-with-body -X "$1" "$ZOPPY_PARTNERS_BASE_URL$2" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" \
        -H "zoppy-access: $ZOPPY_ACCESS" \
        -H 'Content-Type: application/json' \
        ${3:+--data "$3"}
}

field() {
    node -e 'let s="";process.stdin.on("data",(c)=>s+=c).on("end",()=>{const v=JSON.parse(s)[process.argv[1]];console.log(typeof v==="object"?JSON.stringify(v):v)})' "$1"
}

expect() {
    if [ "$2" != "$3" ]; then echo "$1: esperado $3, veio $2" >&2; exit 1; fi
}

cleanup() {
    if [ -n "$PRODUCT_ID" ]; then zoppy DELETE "/products/$PRODUCT_ID" > /dev/null || true; fi
}
trap cleanup EXIT

# 1. Criar (price é número JSON, nunca string)
CREATED=$(zoppy POST /products "{\"externalId\":\"$RUN_ID-sku\",\"name\":\"$RUN_ID-camiseta\",\"status\":\"publish\",\"specification\":\"m\",\"price\":89.9,\"categories\":[\"vestuario\"],\"provider\":\"meu-ecommerce\"}")
PRODUCT_ID=$(echo "$CREATED" | field id)

# 2. Ler de volta pelo id e pelo externalId
expect "price lido" "$(zoppy GET "/products/$PRODUCT_ID" | field price)" "89.9"
expect "busca por externalId" "$(zoppy GET "/products/external/$RUN_ID-sku" | field id)" "$PRODUCT_ID"

# 3. Atualizar com o corpo completo e ler de volta
zoppy PUT "/products/$PRODUCT_ID" "{\"externalId\":\"$RUN_ID-sku\",\"name\":\"$RUN_ID-camiseta\",\"status\":\"draft\",\"specification\":\"m\",\"price\":99.9,\"categories\":[\"vestuario\",\"promocao\"],\"provider\":\"meu-ecommerce\"}" > /dev/null
UPDATED=$(zoppy GET "/products/$PRODUCT_ID")
expect "price atualizado" "$(echo "$UPDATED" | field price)" "99.9"
expect "status atualizado" "$(echo "$UPDATED" | field status)" "draft"
expect "categories atualizadas" "$(echo "$UPDATED" | field categories)" '["vestuario","promocao"]'

# 4. Excluir e conferir 404
expect "DELETE" "$(zoppy DELETE "/products/$PRODUCT_ID" | field result)" "true"
STATUS=$(curl -sS -o /dev/null -w '%{http_code}' "$ZOPPY_PARTNERS_BASE_URL/products/$PRODUCT_ID" -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS")
expect "GET depois do DELETE" "$STATUS" "404"
PRODUCT_ID=""

echo "{\"ok\":true,\"runId\":\"$RUN_ID\"}"
