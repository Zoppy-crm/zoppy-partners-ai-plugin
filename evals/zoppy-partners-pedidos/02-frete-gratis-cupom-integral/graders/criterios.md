---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto (todos obrigatórios)

1. A: `subtotal` 50, `discount` 50, `shipping` **0**, `couponCode` "CORTESIA". Total esperado 0. Nunca `discount` 60 com `shipping` 10 (total negativo -20).
2. B: `subtotal` 100, `discount` 10, `shipping` 0. Total esperado 90.
3. C: `subtotal` **92** (80 + 12), `discount` **0** enviado explicitamente, `shipping` 12. Total esperado 80.
4. Os três com `status` `completed`, `createdAt` `2026-10-01T15:00:00-03:00` (ou equivalente com fuso) e `customerId`.
5. Nenhum payload com campo `total`.

## Erros que reprovam

- Omitir `discount` (C) ou `shipping` (B): a API grava total 0.
- Somar o frete grátis no `subtotal` ou no `discount`.
