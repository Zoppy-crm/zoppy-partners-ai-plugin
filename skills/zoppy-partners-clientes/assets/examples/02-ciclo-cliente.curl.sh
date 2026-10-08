#!/usr/bin/env bash
# Exemplo em curl: criar cliente, buscar por externalId, atualizar, conferir e excluir.
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL. Usa node só para ler o JSON.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

api() {
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

field() { node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(process.argv[1].split(".").reduce((o,k)=>o?.[k],d))' "$1"; }

expect() { [ "$2" = "$3" ] || { echo "$1: esperado $3, veio $2" >&2; exit 1; }; }

# O POST deduplica por telefone: procura um telefone de teste livre antes de criar.
PHONE=""
for _ in $(seq 1 20); do
    CANDIDATE="1190000$(printf '%04d' $((RANDOM % 10000)))"
    if [ "$(status_of "/customers/phone/$CANDIDATE")" = "422" ]; then PHONE="$CANDIDATE"; break; fi
done
[ -n "$PHONE" ] || { echo "não achei telefone de teste livre" >&2; exit 1; }

RUN_ID="skills-test-zoppy-partners-clientes-$(date +%s%3N)"
CUSTOMER_ID=""
cleanup() { [ -z "$CUSTOMER_ID" ] || api DELETE "/customers/$CUSTOMER_ID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# 1. Criar
CREATED=$(api POST /customers "{
  \"externalId\": \"$RUN_ID\",
  \"email\": \"skills-test+2@example.com\",
  \"phone\": \"55$PHONE\",
  \"firstName\": \"Ana\",
  \"lastName\": \"Lima\",
  \"birthDate\": \"1985-01-20\",
  \"gender\": \"f\",
  \"address\": { \"address1\": \"Rua A, 10\", \"city\": \"Recife\", \"state\": \"PE\", \"postcode\": \"50010-000\" }
}")
CUSTOMER_ID=$(echo "$CREATED" | field id)
expect "telefone sem 55" "$(echo "$CREATED" | field phone)" "$PHONE"

# 2. Buscar por externalId
FOUND=$(api GET "/customers/external/$RUN_ID")
expect "busca por externalId" "$(echo "$FOUND" | field id)" "$CUSTOMER_ID"

# 3. Atualizar (phone, firstName, lastName e address são obrigatórios no PUT)
api PUT "/customers/$CUSTOMER_ID" "{
  \"phone\": \"$PHONE\",
  \"firstName\": \"Ana\",
  \"lastName\": \"Lima Costa\",
  \"address\": { \"address1\": \"Rua B, 20\", \"city\": \"Olinda\", \"state\": \"PE\", \"postcode\": \"53010-000\" }
}" >/dev/null

# 4. Conferir com GET
UPDATED=$(api GET "/customers/$CUSTOMER_ID")
expect "sobrenome" "$(echo "$UPDATED" | field lastName)" "Lima Costa"
expect "cidade" "$(echo "$UPDATED" | field address.city)" "Olinda"
expect "e-mail mantido" "$(echo "$UPDATED" | field email)" "skills-test+2@example.com"

# 5. Excluir e conferir
expect "exclusão" "$(api DELETE "/customers/$CUSTOMER_ID" | field result)" "true"
expect "busca depois de excluir" "$(status_of "/customers/$CUSTOMER_ID")" "422"
CUSTOMER_ID=""

echo "{\"ok\":true,\"runId\":\"$RUN_ID\",\"phone\":\"$PHONE\"}"
