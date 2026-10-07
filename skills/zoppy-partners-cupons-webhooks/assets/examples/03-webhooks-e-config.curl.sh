#!/usr/bin/env bash
# Exemplo: listar webhooks e ler a configuração de cupom com curl. Só leitura.
# Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
set -euo pipefail
: "${ZOPPY_PARTNERS_TOKEN:?defina ZOPPY_PARTNERS_TOKEN}"
: "${ZOPPY_ACCESS:?defina ZOPPY_ACCESS}"
: "${ZOPPY_PARTNERS_BASE_URL:?defina ZOPPY_PARTNERS_BASE_URL}"

zoppy() {
    curl -sS --fail-with-body -X "$1" "$ZOPPY_PARTNERS_BASE_URL$2" \
        -H "Authorization: Bearer $ZOPPY_PARTNERS_TOKEN" \
        -H "zoppy-access: $ZOPPY_ACCESS"
}

WEBHOOKS=$(zoppy GET /webhooks)
case "$WEBHOOKS" in \[*) ;; *) echo "GET /webhooks: esperado uma lista, veio $WEBHOOKS" >&2; exit 1 ;; esac

CONFIG=$(zoppy GET /coupons-config)
case "$CONFIG" in *'"percentValue"'*) ;; *) echo "GET /coupons-config sem percentValue: $CONFIG" >&2; exit 1 ;; esac

echo "{\"ok\":true}"
