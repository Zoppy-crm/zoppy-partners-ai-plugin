#!/usr/bin/env bash
# Exemplo: item de pedido aponta para o produto pelo id da Zoppy (UUID). Item com externalId no productId é descartado sem erro.
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL. Usa node só para ler campos do JSON.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

RUN_ID="skills-test-zoppy-partners-produtos-$(date +%s%N)"
CUSTOMER_ID=""; PRODUCT_ID=""; ORDER_ID=""

zoppy() {
    curl -sS --fail-with-body -X "$1" "$ZOPPY_PARTNERS_BASE_URL$2" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" \
        -H "zoppy-access: $ZOPPY_ACCESS" \
        -H 'Content-Type: application/json' \
        ${3:+--data "$3"}
}

status_of() {
    curl -sS -o /dev/null -w '%{http_code}' "$ZOPPY_PARTNERS_BASE_URL$1" -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS"
}

field() {
    node -e 'let s="";process.stdin.on("data",(c)=>s+=c).on("end",()=>console.log(JSON.parse(s)[process.argv[1]]))' "$1"
}

items_summary() {
    node -e 'let s="";process.stdin.on("data",(c)=>s+=c).on("end",()=>console.log(JSON.parse(s).lineItems.map((i)=>i.productId+":"+i.quantity).join(",")))'
}

expect() {
    if [ "$2" != "$3" ]; then echo "$1: esperado $3, veio $2" >&2; exit 1; fi
}

cleanup() {
    if [ -n "$ORDER_ID" ]; then zoppy DELETE "/orders/$ORDER_ID" > /dev/null || true; fi
    if [ -n "$PRODUCT_ID" ]; then zoppy DELETE "/products/$PRODUCT_ID" > /dev/null || true; fi
    if [ -n "$CUSTOMER_ID" ]; then zoppy DELETE "/customers/$CUSTOMER_ID" > /dev/null || true; fi
}
trap cleanup EXIT

# Telefone fictício livre (o cadastro de cliente reaproveita cliente com o mesmo telefone)
PHONE=""
for _ in $(seq 1 20); do
    CANDIDATE="1190000$(printf '%04d' $((RANDOM % 10000)))"
    if [ "$(status_of "/customers/phone/$CANDIDATE")" != "200" ]; then PHONE="$CANDIDATE"; break; fi
done
[ -n "$PHONE" ] || { echo "não achei telefone de teste livre" >&2; exit 1; }

CUSTOMER=$(zoppy POST /customers "{\"externalId\":\"$RUN_ID-cliente\",\"firstName\":\"Skills\",\"lastName\":\"Produtos\",\"phone\":\"$PHONE\",\"email\":\"skills-test+${PHONE: -4}@zoppy.com.br\",\"address\":{\"address1\":\"Rua Teste 1\",\"city\":\"Sao Paulo\",\"state\":\"SP\",\"postcode\":\"01001000\"}}")
expect "cliente criado é o nosso" "$(echo "$CUSTOMER" | field externalId)" "$RUN_ID-cliente"
CUSTOMER_ID=$(echo "$CUSTOMER" | field id)

PRODUCT_ID=$(zoppy POST /products "{\"externalId\":\"$RUN_ID-sku\",\"name\":\"$RUN_ID-caneca\",\"status\":\"publish\",\"price\":50}" | field id)

# Item 1 pelo UUID da Zoppy (gravado); item 2 pelo externalId (descartado sem erro)
ORDER=$(zoppy POST /orders "{\"externalId\":\"$RUN_ID-pedido\",\"customerId\":\"$CUSTOMER_ID\",\"status\":\"on-hold\",\"subtotal\":150,\"discount\":0,\"shipping\":0,\"createdAt\":\"2026-10-07T10:00:00-03:00\",\"lineItems\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2},{\"productId\":\"$RUN_ID-sku\",\"quantity\":1}]}")
ORDER_ID=$(echo "$ORDER" | field id)

expect "itens gravados" "$(zoppy GET "/orders/$ORDER_ID" | items_summary)" "$PRODUCT_ID:2"

echo "{\"ok\":true,\"runId\":\"$RUN_ID\",\"pedido\":\"$ORDER_ID\"}"
