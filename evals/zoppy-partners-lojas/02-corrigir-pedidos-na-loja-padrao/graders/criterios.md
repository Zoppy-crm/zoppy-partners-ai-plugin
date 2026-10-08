---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Lê as credenciais do ambiente; nenhum segredo no código.
- Acha o `id` da loja padrão pelo nome `Integrador Externo` em `GET /stores`.
- Lista os pedidos do período com `GET /orders?after=...` percorrendo todas as páginas e separa os que estão com o `storeId` da loja padrão (a listagem não filtra por loja).
- Corrige com `PUT /orders/{id}` e o `storeId` certo, mandando o pedido inteiro lido de volta: `status`, `subtotal`, `discount`, `shipping`, `createdAt`, `completedAt` quando `completed` e `lineItems`.
- Não manda `couponCode` no `PUT` (ausente mantém o cupom; um código que não existe na Zoppy faz o `PUT` responder 422).
- Não precisa mandar vendedor nem `provider` (ausentes, mantêm).
- Depois do `PUT`, espera alguns segundos, lê o pedido de volta e confere loja, total, data e itens; reenvia se não refletiu.
- Faz a correção com pouco paralelismo e guarda um relatório pedido → loja antiga → loja nova.
- Menciona que o `PUT` passa de novo pelo processamento de pedidos e recomenda conferir com a Zoppy as automações da conta antes de corrigir em lote.

## Erros que reprovam

- `PUT` só com `storeId` ou sem `discount`, `shipping` ou `lineItems`.
- Excluir e recriar os pedidos.
- Mandar no `PUT` o `couponCode` do sistema do integrador.
