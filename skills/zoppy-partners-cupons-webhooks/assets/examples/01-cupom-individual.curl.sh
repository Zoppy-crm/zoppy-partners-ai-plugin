#!/usr/bin/env bash
# Exemplo: cadastrar um cupom individual (com cliente pré-requisito), buscar e excluir com curl.
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL. Usa node só para ler campos do JSON.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

RUN_ID="skills-test-zoppy-partners-cupons-webhooks-$(date +%s%N)"
CODE="SKTCW$(date +%s%N)"
CUSTOMER_ID=""
COUPON_ID=""

zoppy() {
    curl -sS --fail-with-body -X "$1" "$ZOPPY_PARTNERS_BASE_URL$2" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" \
        -H "zoppy-access: $ZOPPY_ACCESS" \
        -H 'Content-Type: application/json' \
        ${3:+--data "$3"}
}

status_of() {
    curl -sS -o /dev/null -w '%{http_code}' "$ZOPPY_PARTNERS_BASE_URL$1" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS"
}

field() {
    node -e 'let s="";process.stdin.on("data",(c)=>s+=c).on("end",()=>{const path=process.argv[1].split(".");let v=JSON.parse(s);for(const k of path)v=v?.[k];console.log(typeof v==="object"?JSON.stringify(v):v)})' "$1"
}

expect() {
    if [ "$2" != "$3" ]; then echo "$1: esperado $3, veio $2" >&2; exit 1; fi
}

cleanup() {
    if [ -n "$COUPON_ID" ]; then zoppy DELETE "/coupons/$COUPON_ID" > /dev/null || true; fi
    if [ -n "$CUSTOMER_ID" ]; then zoppy DELETE "/customers/$CUSTOMER_ID" > /dev/null || true; fi
}
trap cleanup EXIT

# 1. Telefone de teste ainda sem cliente na conta, e o cliente pré-requisito
PHONE=""
for _ in $(seq 1 20); do
    CANDIDATE="119000040$(printf '%02d' $((RANDOM % 100)))"
    if [ "$(status_of "/customers/phone/$CANDIDATE")" != "200" ]; then PHONE="$CANDIDATE"; break; fi
done
[ -n "$PHONE" ] || { echo "nenhum telefone de teste livre" >&2; exit 1; }
CUSTOMER_ID=$(zoppy POST /customers "{\"externalId\":\"$RUN_ID-cliente\",\"firstName\":\"$RUN_ID\",\"lastName\":\"Cupom\",\"phone\":\"$PHONE\",\"email\":\"skills-test+2@zoppy.com.br\",\"address\":{\"address1\":\"Rua Teste 1\",\"city\":\"Sao Paulo\",\"state\":\"SP\",\"postcode\":\"01001000\"}}" | field id)

# 2. Cadastrar o cupom com tipo, mínimo, validade e awaitingOrder explícitos
COUPON_ID=$(zoppy POST /coupons "{\"externalId\":\"$RUN_ID-cupom\",\"code\":\"$CODE\",\"phone\":\"$PHONE\",\"type\":\"percent\",\"amount\":10,\"minPurchaseValue\":50,\"expiryDate\":\"2027-12-31T23:59:59-03:00\",\"awaitingOrder\":false}" | field id)

# 3. Ler de volta
FOUND=$(zoppy GET "/coupons/code/$CODE")
expect "id" "$(echo "$FOUND" | field id)" "$COUPON_ID"
expect "type" "$(echo "$FOUND" | field type)" "percent"
expect "minPurchaseValue" "$(echo "$FOUND" | field minPurchaseValue)" "50"
expect "customer.id" "$(echo "$FOUND" | field customer.id)" "$CUSTOMER_ID"
expect "busca por externalId" "$(zoppy GET "/coupons/external/$RUN_ID-cupom" | field id)" "$COUPON_ID"

# 4. Excluir (a remoção termina em segundo plano)
expect "DELETE" "$(zoppy DELETE "/coupons/$COUPON_ID" | field 0.id)" "$COUPON_ID"
COUPON_ID=""

echo "{\"ok\":true,\"runId\":\"$RUN_ID\",\"code\":\"$CODE\"}"
