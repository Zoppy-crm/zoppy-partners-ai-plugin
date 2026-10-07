# Produtos: erros com o corpo real

Formato: `400` vem de validação de tipo e formato, com `message` em lista; `422` vem de regra de negócio,
com `message` em texto; `404` quando o produto não existe na conta (ou foi excluído).

| Situação | Status | Corpo |
|---|---|---|
| `name` ausente | 400 | `{"message":["Name cannot be empty","name must be a string"],"error":"Bad Request","statusCode":400}` |
| `name` vazio (`""`) | 400 | `{"message":["Name cannot be empty"],...}` |
| `name` número | 400 | `{"message":["name must be a string"],...}` |
| `price` string (`"89.90"`) ou ausente | 400 | `{"message":["price must not be less than 0","price must be a number conforming to the specified constraints"],...}` |
| `price` negativo | 400 | `{"message":["price must not be less than 0"],...}` |
| `externalId` número | 400 | `{"message":["externalId must be a string"],...}` |
| `categories` string | 400 | `{"message":["categories must be an array"],...}` |
| `categories` com item vazio | 400 | `{"message":["Categories cannot contain empty values"],...}` |
| `categories` com item número | 400 | `{"message":["Each category must be a string"],...}` |
| `provider` com espaço ou vazio | 400 | `{"message":["Provider deve conter apenas letras, números, hífens e underscores (sem espaços)"],...}` |
| `provider` com mais de 50 caracteres | 400 | `{"message":["Provider deve ter no máximo 50 caracteres"],...}` |
| `status` ausente, maiúsculo ou fora da lista | 422 | `{"message":"Invalid status","error":"Unprocessable Entity","statusCode":422}` |
| `specification` fora de `m`/`f` (inclui `M`) | 422 | `{"message":"Invalid specification",...}` |
| PUT com `name` usado por outro produto | 422 | `{"message":"Product name is already being used",...}` |
| GET, PUT ou DELETE de id inexistente ou excluído | 404 | `{"message":"Product not found","error":"Not Found","statusCode":404}` |
| GET por `externalId` ou nome sem produto | 404 | `{"message":"Product not found",...}` |
| Listagem sem `after` ou com data inválida | 422 | `{"message":"Invalid after date",...}` |
| Listagem sem `page` | 422 | `{"message":"Page parameter is required",...}` |
| Listagem com `page=0` | 422 | `{"message":"Page needs to be bigger than 0",...}` |
| Listagem com `pageSize` acima de 50 | 422 | `{"message":"Page size needs to be less than or equal 50",...}` |
| Listagem com `updatedAt` inválido | 422 | `{"message":"Invalid updatedAt date",...}` |

## Respostas 200 que escondem problema

Não são erro HTTP, mas quase sempre são bug na integração:

| Situação | O que acontece |
|---|---|
| POST com `name` (e `provider`) de produto existente | Devolve o existente; preço, status, specification e externalId enviados são ignorados |
| POST com `externalId` existente e `name` novo | Cria outro produto |
| POST com `name` de mais de 255 caracteres | Grava cortado; o próximo POST igual cria duplicata |
| Campos `sku`, `stock`, `promotionalPrice`, `imageUrl`, `variations` e afins | Aceitos e descartados |
| Pedido com `productId` igual ao `externalId`, inexistente ou de produto excluído | O pedido é criado e o item é descartado |
| PUT sem `categories` | Produto fica sem categorias |
