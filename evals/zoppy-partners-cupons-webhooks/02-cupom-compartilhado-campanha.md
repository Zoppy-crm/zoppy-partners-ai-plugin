# Eval 02: cupom compartilhado de campanha

## Pedido do desenvolvedor

"Quero cadastrar na Zoppy o cupom BLACK15, 15% de desconto, para qualquer cliente, limitado a
1000 usos, válido até 30/11/2026 23:59 de Brasília, compra mínima de R$ 200. No nosso sistema o
ID dele é o UUID 3f2a9c1e-7b44-4d0a-9e61-2c5f8d7a1b90. Depois preciso conseguir achar o cupom de
novo pela API."

## Critérios de acerto

- Usa `POST /coupons/shared` (não `POST /coupons`).
- Corpo com `code: "BLACK15"`, `type: "percent"`, `amount: 15`, `usageLimit: 1000`,
  `minPurchaseValue: 200`, `expiryDate` ISO 8601 com fuso.
- Não manda o UUID como `externalId`: explica que no compartilhado o `externalId` é inteiro de 0
  a 2147483647 e que um texto vira 0 sem erro. Usa um inteiro próprio (ou mapeamento) e guarda o
  `id` devolvido pela Zoppy.
- Para reencontrar o cupom, usa `GET /coupons/code/BLACK15` ou `GET /coupons/{id}`, não a busca
  por `externalId` com o UUID.
- Não manda `phone`.
- Valida com `node scripts/validate.mjs --schema=cupom-compartilhado.create` sem erro.
