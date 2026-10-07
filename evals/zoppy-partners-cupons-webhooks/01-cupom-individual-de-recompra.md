# Eval 01: registrar cupom individual de recompra

## Pedido do desenvolvedor

"Minha loja gera, no nosso sistema, um cupom de R$ 30 para o cliente voltar a comprar, sem valor
mínimo, válido até 31/12/2026 às 23:59 (horário de Brasília). O cliente tem telefone
(11) 98765-4321 e já está na Zoppy. Escreva em Node a função que registra esse cupom na Zoppy
com o código VOLTA30 e o nosso ID cupom-8812. O cupom só pode ser baixado quando o cliente digitar
o código. Também quero uma função que marca o cupom como usado na Zoppy quando ele é resgatado
no nosso PDV."

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
- Roda `node scripts/validate.mjs --schema=cupom.create` no corpo antes de enviar, sem erro e sem
  aviso de `minPurchaseValue` ou `awaitingOrder`.
- A função de baixa usa `PUT /coupons/code/VOLTA30` (ou por `id`) com
  `{"used": true, "awaitingOrder": false}`, e não só `{"used": true}` (que deixa o cupom ser
  aplicado de novo a um pedido sem código).
