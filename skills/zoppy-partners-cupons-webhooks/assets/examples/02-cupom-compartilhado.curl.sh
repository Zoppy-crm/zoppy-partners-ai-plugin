#!/usr/bin/env bash
# Exemplo: cadastrar um cupom compartilhado com limite de uso, buscar e excluir com curl.
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL. Usa node só para ler campos do JSON.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

NOW=$(date +%s%N)
RUN_ID="skills-test-zoppy-partners-cupons-webhooks-$NOW"
CODE="SKTCWSH$NOW"
EXTERNAL_ID=$(( $(date +%s) % 2000000000 + 1 ))
CREATED=""

zoppy() {
    curl -sS --fail-with-body -X "$1" "$ZOPPY_PARTNERS_BASE_URL$2" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" \
        -H "zoppy-access: $ZOPPY_ACCESS" \
        -H 'Content-Type: application/json' \
        ${3:+--data "$3"}
}

field() {
    node -e 'let s="";process.stdin.on("data",(c)=>s+=c).on("end",()=>{const path=process.argv[1].split(".");let v=JSON.parse(s);for(const k of path)v=v?.[k];console.log(typeof v==="object"?JSON.stringify(v):v)})' "$1"
}

expect() {
    if [ "$2" != "$3" ]; then echo "$1: esperado $3, veio $2" >&2; exit 1; fi
}

cleanup() {
    if [ -n "$CREATED" ]; then zoppy DELETE "/coupons/code/$CODE" > /dev/null || true; fi
}
trap cleanup EXIT

# externalId inteiro (0 a 2147483647) e usageLimit explícito (sem ele o cupom aceita um uso só)
CREATED=$(zoppy POST /coupons/shared "{\"externalId\":$EXTERNAL_ID,\"code\":\"$CODE\",\"type\":\"percent\",\"amount\":15,\"minPurchaseValue\":0,\"usageLimit\":100,\"expiryDate\":\"2027-12-31T23:59:59-03:00\"}" | field id)

FOUND=$(zoppy GET "/coupons/code/$CODE")
expect "id" "$(echo "$FOUND" | field id)" "$CREATED"
expect "externalId" "$(echo "$FOUND" | field externalId)" "$EXTERNAL_ID"
expect "usageLimit" "$(echo "$FOUND" | field usageLimit)" "100"
expect "busca por externalId" "$(zoppy GET "/coupons/external/$EXTERNAL_ID" | field id)" "$CREATED"

expect "DELETE" "$(zoppy DELETE "/coupons/code/$CODE" | field 0.id)" "$CREATED"
CREATED=""

echo "{\"ok\":true,\"runId\":\"$RUN_ID\",\"code\":\"$CODE\"}"
