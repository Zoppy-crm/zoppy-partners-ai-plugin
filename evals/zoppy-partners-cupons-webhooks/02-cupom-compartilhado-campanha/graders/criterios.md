---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Usa `POST /coupons/shared` (não `POST /coupons`).
- Corpo com `code: "BLACK15"`, `type: "percent"`, `amount: 15`, `usageLimit: 1000`,
  `minPurchaseValue: 200`, `expiryDate` ISO 8601 com fuso.
- Não manda o UUID como `externalId`: explica que no compartilhado o `externalId` é inteiro de 1
  a 2147483647 e que um texto não é preservado (vira o número do começo dele ou 0, sem erro). Usa um
  inteiro próprio (ou omite o campo) e guarda o `id` devolvido pela Zoppy.
- Para reencontrar o cupom, usa `GET /coupons/code/BLACK15` ou `GET /coupons/{id}`, não a busca
  por `externalId` com o UUID.
- Não manda `phone`.
