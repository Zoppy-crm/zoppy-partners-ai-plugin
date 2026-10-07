---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Chama `POST {ZOPPY_PARTNERS_BASE_URL}/coupons` com `Authorization: Bearer`, `zoppy-access` e
  `Content-Type: application/json`, credenciais lidas de variáveis de ambiente.
- Corpo com `code: "VOLTA30"`, `externalId: "cupom-8812"`, `amount: 30` (número),
  `type: "fixed_cart"`, `minPurchaseValue: 0`, `phone` só com dígitos (`"11987654321"`),
  `expiryDate` ISO 8601 com fuso (`"2026-12-31T23:59:59-03:00"` ou equivalente em UTC) e
  `awaitingOrder: false`.
- Não manda `usageLimit`, `usageLimitPerUser`, `description` nem `createOnProvider` (ou, se mandar,
  explica que são ignorados ou fora do escopo).
- Trata 422 lendo `message` (por exemplo `O código do coupon já está sendo utilizado`).
- A função de baixa usa `PUT /coupons/code/VOLTA30` (ou por `id`) com
  `{"used": true, "awaitingOrder": false}`, e não só `{"used": true}` (que deixa o cupom ser
  aplicado de novo a um pedido sem código).
