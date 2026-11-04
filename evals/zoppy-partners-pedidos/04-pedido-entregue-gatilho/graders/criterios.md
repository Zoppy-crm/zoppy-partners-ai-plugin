---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto (todos obrigatórios)

1. Marca a entrega com `PUT /orders/{id}` (o `id` da Zoppy), enviando `status: "completed"` e `subStatus: "delivered"`.
2. O PUT reenvia o pedido inteiro: `subtotal` (itens + frete), `discount`, `shipping`, **`lineItems`** e **`createdAt`** com a data da compra.
3. Pedido ainda não pago (voucher em `on-hold`) não é marcado como entregue: a função não envia `delivered` com status diferente de `completed` (a API responde `422 subStatus requires status completed`), e explica que o `delivered` vai quando o pedido for `completed`.
4. Não inventa outro status para entregue (`delivered` como `status`, `shipped`, `fulfilled`): entregue é `subStatus`, o status continua `completed`.
5. Depois do PUT, lê o pedido de volta (`GET /orders/{id}`) e confere `subStatus`.

## Erros que reprovam

- `status: "delivered"` ou qualquer valor fora de `completed`, `on-hold`, `canceled`, `processing` no `status` (422 `Invalid status`).
- PUT parcial só com `status`/`subStatus` (responde 200, mas grava total 0 e apaga os itens).
- Enviar `subStatus: "delivered"` em pedido `on-hold`.
