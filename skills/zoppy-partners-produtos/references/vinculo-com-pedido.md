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

- `lineItems[].product` traz o produto como ele está **agora**. Mudar o preço do produto depois da
  venda muda `lineItems[].product.price` na leitura do pedido; o `total` do pedido não muda.
- Excluir o produto faz o item sumir de `lineItems` na leitura do pedido.
- Se você recriar o produto com o mesmo `externalId`, o item volta a aparecer na leitura, apontando
  para o produto novo em `lineItems[].product` (o `lineItems[].productId` continua o id antigo).

Conclusão prática: não exclua produto que já foi vendido; para tirar de linha, use `PUT` com
`status: "inactive"`.
