# Eval 03: preço não atualiza e produto duplicado

## Pedido do desenvolvedor

> Mudei o preço do produto "Camiseta Polo" de 89.90 para 99.90 e reenviei o mesmo `POST /products` com o
> mesmo `externalId`. A API respondeu 200, mas o preço continua 89.9. Em outro produto, troquei o nome
> e reenviei com o mesmo `externalId`, e agora tenho dois produtos. Também tenho um produto de
> R$ 12.345,67 que aparece como 12345.7. O que está errado e como corrijo?

## Critérios de acerto

1. Explica que o POST deduplica por `name` (e `provider`), não por `externalId`: com o mesmo nome ele
   devolve o produto existente e ignora o preço enviado.
2. Explica que, com nome diferente, o POST cria outro produto mesmo com `externalId` repetido.
3. Corrige com `GET /products/external/{externalId}` seguido de `PUT /products/{id}` com o corpo
   completo (`name`, `status`, `price` e `categories`).
4. Para o duplicado, indica excluir o produto sobrando com `DELETE /products/{id}` (avisando que, se ele
   já estiver em pedido, o item some da leitura do pedido) ou mantê-lo com `status: "inactive"`.
5. Explica que o preço é gravado com 6 dígitos significativos (12345.67 vira 12345.7) e que a API não
   tem como guardar o valor exato; não promete que mandar como string resolve (string dá 400).
6. Confere o resultado com `GET /products/{id}` e não com a resposta do PUT.
