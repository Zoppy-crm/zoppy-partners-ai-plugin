---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

1. Explica que o POST deduplica por `name` (e `provider`), não por `externalId`: com o mesmo nome ele
   devolve o produto existente e ignora o preço enviado.
2. Explica que, com nome diferente, o POST cria outro produto mesmo com `externalId` repetido.
3. Corrige com `GET /products/external/{externalId}` seguido de `PUT /products/{id}` com o corpo
   completo (`name`, `status`, `price` e `categories`).
4. Para o duplicado, indica excluir o produto sobrando com `DELETE /products/{id}` (avisando que, se ele
   já estiver em pedido, o item some da leitura do pedido) ou mantê-lo com `status: "inactive"`.
5. Explica que o preço é gravado como float de 32 bits e lido com 6 dígitos significativos (12345.67
   vira 12345.7) e que a API não tem como guardar o valor exato; não promete que mandar como string
   resolve (string dá 400).
6. Confere o resultado com `GET /products/{id}` e não com a resposta do PUT.
