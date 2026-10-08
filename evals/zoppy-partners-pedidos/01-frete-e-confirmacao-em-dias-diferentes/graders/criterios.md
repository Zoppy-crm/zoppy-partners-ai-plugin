---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto (todos obrigatórios)

1. `POST {ZOPPY_PARTNERS_BASE_URL}/orders` com `Authorization: Bearer` lido de `ZOPPY_PARTNERS_TOKEN` e `zoppy-access` lido de `ZOPPY_ACCESS`; nenhum segredo no código.
2. `subtotal` = **151.60** (itens + frete), `shipping` = **20**, `discount` = **7.58**, como números JSON.
3. Não envia campo `total` (ou, se enviar, a resposta explica que é ignorado). O código ou o texto deixa claro que o total gravado esperado é 124,02.
4. `createdAt` = data da **venda** com fuso: `2026-09-05T10:26:00-03:00` (ou o equivalente `2026-09-05T13:26:00Z`).
5. `completedAt` = `2026-09-09T14:00:00-03:00` (ou equivalente) e `status` = `completed`.
6. `externalId` = `"7003"` (string) e `customerId` = o id da Zoppy informado.
7. `lineItems` = `[{ "productId": "7f3c2a10-5b1e-4c8d-9a6f-2e4b8c1d0a02", "quantity": 2 }]`.

## Erros que reprovam

- `subtotal` 131.60 (frete fora do subtotal): o total gravado seria 104,02.
- Sem `createdAt`: o pedido ficaria datado de 09/09, fora do período da venda.
- `createdAt` sem fuso, só com a data (`2026-09-05`) ou em `05/09/2026`.
- Valores como texto (`"151.60"`).
