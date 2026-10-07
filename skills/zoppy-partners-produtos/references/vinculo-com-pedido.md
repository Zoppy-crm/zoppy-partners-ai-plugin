# Produto no item do pedido

Valores, datas e status do pedido estão na skill **zoppy-partners-pedidos**. Aqui fica só a ligação
entre o item do pedido e o produto.

## O que vai em `lineItems[].productId`

O `id` que a Zoppy devolveu para o produto (UUID), por exemplo `59d380ad-1f66-4f42-87d6-9255d50f7101`.
Nunca o seu `externalId`.

```jsonc
"lineItems": [
  { "productId": "59d380ad-1f66-4f42-87d6-9255d50f7101", "quantity": 2 }
]
```

Se você só tem o seu código, resolva antes:

```text
GET /products/external/{seu externalId}  ->  200 {"id": "59d380ad-...", ...}
```

Guarde o par `externalId -> id` no seu lado para não repetir essa busca a cada pedido.

## Itens descartados sem erro

Teste em staging: pedido com quatro itens.

| `productId` enviado | Resultado |
|---|---|
| UUID de produto ativo | Item gravado |
| `externalId` do mesmo produto | Descartado |
| UUID de produto excluído | Descartado |
| UUID que não existe | Descartado |

O `POST /orders` respondeu 200 com `lineItems` de 1 item. Sempre compare o tamanho de `lineItems` da
resposta com o que você enviou e trate a diferença como erro na sua integração.

## Leitura do pedido depois

Na leitura do pedido (`GET /orders/{id}`), `lineItems[].product` é montado na hora: a Zoppy procura, entre os produtos ativos, o que tem o mesmo id **ou** o mesmo `externalId` do
item. Consequências:

- Identifique o item por `lineItems[].productId` (é o id gravado na venda), não por
  `lineItems[].product.id`.
- Se dois produtos do mesmo pedido estão sem `externalId`, ou têm o mesmo `externalId`, um item pode
  mostrar o produto do outro (nome e preço errados) e a ordem dos itens pode mudar. Teste em staging:
  pedido com P1 e P2 sem `externalId`; no GET o item de P1 apareceu com o produto P2, e o item de P3
  com o produto P4 (os dois com o mesmo `externalId`). **Mande
  `externalId` único em todo produto.**
- Com `externalId` único:
  - `lineItems[].product` traz o produto como ele está **agora**. Mudar o preço do produto depois da
    venda muda `lineItems[].product.price` na leitura do pedido; o `total` do pedido não muda.
  - Excluir o produto faz o item sumir de `lineItems` na leitura do pedido. (Sem `externalId` único, o
    item pode continuar aparecendo com outro produto do pedido.)
  - Se você recriar o produto com o mesmo `externalId`, o item volta a aparecer na leitura, apontando
    para o produto novo em `lineItems[].product` (o `lineItems[].productId` continua o id antigo).

Conclusão prática: não exclua produto que já foi vendido; para tirar de linha, use `PUT` com
`status: "inactive"` (o item continua no pedido, com `product.status` `inactive`).
