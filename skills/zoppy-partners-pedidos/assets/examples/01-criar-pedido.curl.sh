#!/usr/bin/env bash
# Exemplo: criar pedido com frete e desconto e conferir o total gravado.
# Itens 131,60 + frete 20 - desconto 7,58: subtotal 151,60 (com frete), total gravado 124,02 (sem frete).
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL. Usa node só para ler campos do JSON.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

RUN_ID="skills-test-zoppy-partners-pedidos-$(date +%s%N)"
CUSTOMER_ID=""; PRODUCT_ID=""; ORDER_ID=""

zoppy() {
    curl -sS --fail-with-body -X "$1" "$ZOPPY_PARTNERS_BASE_URL$2" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" \
        -H "zoppy-access: $ZOPPY_ACCESS" \
        -H 'Content-Type: application/json' \
        ${3:+--data "$3"}
}

status_of() {
    curl -sS -o /dev/null -w '%{http_code}' -X "${2:-GET}" "$ZOPPY_PARTNERS_BASE_URL$1" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS" \
        -H 'Content-Type: application/json' ${3:+--data "$3"}
}

field() {
    node -e 'let s="";process.stdin.on("data",(c)=>s+=c).on("end",()=>{const v=process.argv[1].split(".").reduce((o,k)=>o?.[k],JSON.parse(s));console.log(v)})' "$1"
}

cents() {
    node -e 'console.log(Math.round(Number(process.argv[1])*100))' "$1"
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

# 1. Pré-requisitos: cliente (telefone fictício livre) e produto. O pedido usa os ids da Zoppy.
PHONE=""
for _ in $(seq 1 20); do
    CANDIDATE="11900002$(printf '%03d' $((RANDOM % 1000)))"
    if [ "$(status_of "/customers/phone/$CANDIDATE")" != "200" ]; then PHONE="$CANDIDATE"; break; fi
done
[ -n "$PHONE" ] || { echo "não achei telefone de teste livre" >&2; exit 1; }

CUSTOMER=$(zoppy POST /customers "{\"externalId\":\"$RUN_ID-cliente\",\"firstName\":\"Skills\",\"lastName\":\"Pedidos\",\"phone\":\"$PHONE\",\"email\":\"skills-test+${PHONE: -4}@example.com\",\"address\":{\"address1\":\"Rua Teste 1\",\"city\":\"Sao Paulo\",\"state\":\"SP\",\"postcode\":\"01001000\"}}")
expect "cliente criado é o nosso" "$(echo "$CUSTOMER" | field externalId)" "$RUN_ID-cliente"
CUSTOMER_ID=$(echo "$CUSTOMER" | field id)
PRODUCT_ID=$(zoppy POST /products "{\"externalId\":\"$RUN_ID-sku\",\"name\":\"$RUN_ID-marmita\",\"status\":\"publish\",\"price\":65.8}" | field id)

# 2. Pedido vendido em 05/09 e pago em 09/09. subtotal = itens + frete; não existe campo total.
ORDER_BODY="{\"externalId\":\"$RUN_ID-pedido\",\"customerId\":\"$CUSTOMER_ID\",\"status\":\"completed\",\"subtotal\":151.60,\"discount\":7.58,\"shipping\":20,\"createdAt\":\"2026-09-05T10:26:00-03:00\",\"completedAt\":\"2026-09-09T14:00:00-03:00\",\"lineItems\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}]}"
ORDER_ID=$(zoppy POST /orders "$ORDER_BODY" | field id)

# 3. Ler de volta e conferir.
BACK=$(zoppy GET "/orders/$ORDER_ID")
expect "total gravado (itens com desconto, sem frete)" "$(cents "$(echo "$BACK" | field total)")" "12402"
expect "subtotal devolvido (total + discount + shipping)" "$(cents "$(echo "$BACK" | field subtotal)")" "15160"
expect "createdAt é a data da venda" "$(echo "$BACK" | field createdAt)" "2026-09-05T13:26:00.000Z"
expect "completedAt é a data do pagamento" "$(echo "$BACK" | field completedAt)" "2026-09-09T17:00:00.000Z"
expect "busca pelo externalId" "$(zoppy GET "/orders/external/$RUN_ID-pedido" | field id)" "$ORDER_ID"

# 4. Mesmo externalId de novo: 422 External id already exists.
expect "externalId repetido" "$(status_of /orders POST "$ORDER_BODY")" "422"

echo "{\"ok\":true,\"runId\":\"$RUN_ID\",\"pedido\":\"$ORDER_ID\"}"
