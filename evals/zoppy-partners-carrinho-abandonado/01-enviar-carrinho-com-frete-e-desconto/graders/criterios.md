---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente; nenhum segredo no código.
- `POST {base}/abandoned-carts` com `Authorization: Bearer` e `zoppy-access`.
- Corpo com `externalId: "chk-abc123"`, `customerId` e `lineItems[0].productId` com os ids Zoppy dados, `quantity: 2`.
- `subtotal: 120` (produtos 100 + frete 20), `discount: 10`, `shipping: 20`. Total esperado na leitura: `90`.
- `url` com o link de recuperação.
- `createdAt: "2026-09-05T10:26:00-03:00"` (com fuso), não `"2026-09-05 10:26"` nem `05/09/2026`.
- Confere a resposta por `total === 90` e `discount === 10`; não espera `subtotal === 120` nem `shipping === 20` na leitura (voltam `100` e `0`). Espera `createdAt` `2026-09-05T13:26:00.000Z`.
- Confere `lineItems.length === 1`.

## Reprova se

- Mandar `subtotal: 100` (sem frete): total gravado 70.
- Omitir `discount` ou `shipping`: total gravado 0.
- Usar o `externalId` do produto ou do cliente no lugar do id Zoppy.
- Tratar o 200 do POST como 201 obrigatório ou falhar porque `shipping` voltou 0.
