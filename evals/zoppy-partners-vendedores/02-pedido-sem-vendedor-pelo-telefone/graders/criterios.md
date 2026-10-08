---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Explica a causa: o telefone do vendedor foi gravado como veio (`+55 (11) 98765-4321`), e o pedido compara o número normalizado (`11987654321`) com o gravado, então nunca casa, nem mandando o mesmo texto.
- Recomenda atribuir por `userId` (o `id` do vendedor) ou por `seller.email`, que não dependem do formato do telefone.
- Diz que não existe `PUT /users` para corrigir o telefone pela API.
- Não recomenda excluir e recriar a vendedora com o mesmo e-mail (o e-mail de usuário excluído responde `422 User email already in use.`).
- Para os pedidos já gravados sem vendedor, indica reenviar por `PUT /orders/{id}` com o pedido inteiro e o `userId` (ou aponta a skill zoppy-partners-pedidos para o reenvio completo).
- Para próximos cadastros, recomenda gravar o telefone só com dígitos, DDD + número, sem 55.

## Erros que reprovam

- Dizer que é preciso mandar o telefone do pedido com `+55` ou com máscara.
- Recomendar excluir e recriar a vendedora com o mesmo e-mail.
