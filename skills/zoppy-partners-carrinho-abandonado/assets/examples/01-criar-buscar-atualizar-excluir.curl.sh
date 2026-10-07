#!/usr/bin/env bash
# Exemplo em curl: criar, buscar, atualizar e excluir um carrinho abandonado, conferindo a leitura de volta.
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

RUN_ID="skills-test-zoppy-partners-carrinho-abandonado-$(date +%s%N | cut -c1-13)"
CUSTOMER_ID=""
PRODUCT_ID=""
CART_ID=""

zoppy() {
    local method=$1 path=$2 body=${3:-}
    local args=(-sS --fail-with-body -X "$method" "$ZOPPY_PARTNERS_BASE_URL$path"
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS")
    if [ -n "$body" ]; then args+=(-H 'Content-Type: application/json' --data "$body"); fi
    curl "${args[@]}"
}

json_field() {
    # Lê o primeiro campo de nível superior (string ou número) de uma resposta JSON.
    grep -o "\"$1\":[^,}]*" | head -1 | cut -d: -f2- | tr -d '"'
}

expect() {
    if [ "$2" != "$3" ]; then echo "$1: esperado $3, veio $2" >&2; exit 1; fi
}

cleanup() {
    [ -n "$CART_ID" ] && zoppy DELETE "/abandoned-carts/$CART_ID" >/dev/null 2>&1 || true
    [ -n "$PRODUCT_ID" ] && zoppy DELETE "/products/$PRODUCT_ID" >/dev/null 2>&1 || true
    [ -n "$CUSTOMER_ID" ] && zoppy DELETE "/customers/$CUSTOMER_ID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# A criação de cliente reaproveita o cliente que já tem o mesmo telefone: escolha um telefone livre.
PHONE=""
for _ in $(seq 1 20); do
    CANDIDATE="11900003$(printf '%03d' $((RANDOM % 1000)))"
    FOUND=$(curl -sS -o /dev/null -w '%{http_code}' "$ZOPPY_PARTNERS_BASE_URL/customers/phone/$CANDIDATE" -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS")
    if [ "$FOUND" = "422" ] || [ "$FOUND" = "404" ]; then PHONE=$CANDIDATE; break; fi
done
[ -n "$PHONE" ] || { echo "nenhum telefone livre na faixa 11900003000 a 11900003999" >&2; exit 1; }

CUSTOMER=$(zoppy POST /customers "{\"externalId\":\"$RUN_ID-cliente\",\"firstName\":\"Teste\",\"lastName\":\"Carrinho\",\"phone\":\"$PHONE\",\"email\":\"skills-test+${PHONE: -4}@zoppy.com.br\",\"address\":{\"address1\":\"Rua Exemplo 1\",\"city\":\"Sao Paulo\",\"state\":\"SP\",\"postcode\":\"01001000\"}}")
expect "cliente criado por este exemplo" "$(echo "$CUSTOMER" | json_field externalId)" "$RUN_ID-cliente"
CUSTOMER_ID=$(echo "$CUSTOMER" | json_field id)
PRODUCT_ID=$(zoppy POST /products "{\"externalId\":\"$RUN_ID-produto\",\"name\":\"$RUN_ID produto\",\"price\":50,\"status\":\"publish\"}" | json_field id)

# Produtos 100 + frete 20 = subtotal 120; desconto 10. Total gravado = 120 - 10 - 20 = 90.
CREATED=$(zoppy POST /abandoned-carts "{\"externalId\":\"$RUN_ID-carrinho\",\"customerId\":\"$CUSTOMER_ID\",\"subtotal\":120,\"discount\":10,\"shipping\":20,\"url\":\"https://loja.exemplo.com.br/carrinho/$RUN_ID\",\"lineItems\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":2}],\"createdAt\":\"2026-10-01T10:00:00-03:00\"}")
CART_ID=$(echo "$CREATED" | json_field id)
expect "total gravado" "$(echo "$CREATED" | json_field total)" 90

READ=$(zoppy GET "/abandoned-carts/external/$RUN_ID-carrinho")
expect "GET por externalId: id" "$(echo "$READ" | json_field id)" "$CART_ID"
expect "GET por externalId: createdAt" "$(echo "$READ" | grep -o '"createdAt":"[^"]*"' | head -1 | cut -d'"' -f4)" "2026-10-01T13:00:00.000Z"

# PUT substitui valores, URL e a lista inteira de itens.
zoppy PUT "/abandoned-carts/$CART_ID" "{\"subtotal\":170,\"discount\":0,\"shipping\":20,\"url\":\"https://loja.exemplo.com.br/carrinho/$RUN_ID-v2\",\"lineItems\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":3}]}" >/dev/null
READ=$(zoppy GET "/abandoned-carts/$CART_ID")
expect "total depois do PUT" "$(echo "$READ" | json_field total)" 150

DELETED=$(zoppy DELETE "/abandoned-carts/$CART_ID")
expect "DELETE result" "$(echo "$DELETED" | json_field result)" true
STATUS=$(curl -sS -o /dev/null -w '%{http_code}' "$ZOPPY_PARTNERS_BASE_URL/abandoned-carts/$CART_ID" -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" -H "zoppy-access: $ZOPPY_ACCESS")
expect "GET depois do DELETE" "$STATUS" 404
CART_ID=""

echo "{\"ok\":true,\"runId\":\"$RUN_ID\"}"
