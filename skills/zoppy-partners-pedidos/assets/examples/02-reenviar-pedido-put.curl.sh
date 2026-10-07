#!/usr/bin/env bash
# Exemplo: PUT como reenvio. O PUT recalcula o total e substitui itens; reenvie o pedido inteiro,
# sempre com createdAt (sem ele, um PUT com completedAt troca a data do pedido pela do pagamento).
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
    curl -sS -o /dev/null -w '%{http_code}' "$ZOPPY_PARTNERS_BASE_URL$1" -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS"
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

# 1. Pré-requisitos: cliente, produto e pedido aguardando pagamento.
PHONE=""
for _ in $(seq 1 20); do
    CANDIDATE="11900002$(printf '%03d' $((RANDOM % 1000)))"
    if [ "$(status_of "/customers/phone/$CANDIDATE")" != "200" ]; then PHONE="$CANDIDATE"; break; fi
done
[ -n "$PHONE" ] || { echo "não achei telefone de teste livre" >&2; exit 1; }

CUSTOMER=$(zoppy POST /customers "{\"externalId\":\"$RUN_ID-cliente\",\"firstName\":\"Skills\",\"lastName\":\"Pedidos\",\"phone\":\"$PHONE\",\"email\":\"skills-test+${PHONE: -4}@zoppy.com.br\",\"address\":{\"address1\":\"Rua Teste 1\",\"city\":\"Sao Paulo\",\"state\":\"SP\",\"postcode\":\"01001000\"}}")
expect "cliente criado é o nosso" "$(echo "$CUSTOMER" | field externalId)" "$RUN_ID-cliente"
CUSTOMER_ID=$(echo "$CUSTOMER" | field id)
PRODUCT_ID=$(zoppy POST /products "{\"externalId\":\"$RUN_ID-sku\",\"name\":\"$RUN_ID-marmita\",\"status\":\"publish\",\"price\":50}" | field id)

SALE_DATE="2026-09-05T10:26:00-03:00"
ORDER_ID=$(zoppy POST /orders "{\"externalId\":\"$RUN_ID-pedido\",\"customerId\":\"$CUSTOMER_ID\",\"status\":\"on-hold\",\"subtotal\":115,\"discount\":10,\"shipping\":15,\"createdAt\":\"$SALE_DATE\",\"lineItems\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}]}" | field id)

# 2. Reenvio completo: pago em 09/09 com frete maior. Mesmo createdAt, mesmos itens.
#    Um PUT logo depois do POST pode ser sobrescrito pelo processamento do POST:
#    espere, leia de volta e reenvie se o pedido não refletir o PUT.
PUT_BODY="{\"status\":\"completed\",\"subtotal\":120,\"discount\":10,\"shipping\":20,\"createdAt\":\"$SALE_DATE\",\"completedAt\":\"2026-09-09T14:00:00-03:00\",\"lineItems\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}]}"
for ATTEMPT in 1 2 3; do
    zoppy PUT "/orders/$ORDER_ID" "$PUT_BODY" > /dev/null
    sleep 5
    BACK=$(zoppy GET "/orders/$ORDER_ID")
    if [ "$(echo "$BACK" | field status)" = "completed" ] && [ "$(cents "$(echo "$BACK" | field shipping)")" = "2000" ]; then break; fi
    echo "PUT não refletido na leitura (tentativa $ATTEMPT); reenviando" >&2
done

# 3. Conferir: total recalculado, data da venda mantida, itens presentes.
expect "total recalculado" "$(cents "$(echo "$BACK" | field total)")" "9000"
expect "createdAt mantido" "$(echo "$BACK" | field createdAt)" "2026-09-05T13:26:00.000Z"
expect "completedAt gravado" "$(echo "$BACK" | field completedAt)" "2026-09-09T17:00:00.000Z"
expect "itens mantidos" "$(echo "$BACK" | field lineItems.length)" "1"

echo "{\"ok\":true,\"runId\":\"$RUN_ID\",\"pedido\":\"$ORDER_ID\"}"
