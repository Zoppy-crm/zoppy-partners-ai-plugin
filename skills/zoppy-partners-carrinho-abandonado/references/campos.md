# Campos do carrinho abandonado

## Sumário

- POST /abandoned-carts: corpo
- PUT /abandoned-carts/:id: corpo
- Item do carrinho (lineItems)
- Resposta
- Listagem
- Datas

## POST /abandoned-carts: corpo

| Campo | Tipo | Obrigatório | Validação real | O que é gravado |
|---|---|---|---|---|
| `externalId` | string | não | número: 400 `externalId must be a string`; repetido entre carrinhos não excluídos: 422 | como veio; ausente fica `null` |
| `customerId` | string | sim | ausente ou número: 400 `customerId must be a string`; `""`, id inexistente na conta ou `externalId` do cliente: 422 `Customer not found` | o cliente do carrinho |
| `subtotal` | number | sim | ausente ou string (`"199.90"`): 400 `subtotal must be a number conforming to the specified constraints` | o valor enviado |
| `discount` | number ou null | não | string: 400 | o valor enviado; `null` conta como 0 no total |
| `shipping` | number ou null | não | string: 400 | não é guardado separado; entra só na conta do total |
| `url` | string | sim | ausente ou `""`: 422 `Abandoned Cart URL is required.`; número: 400 `url must be a string` | sem espaços nas pontas; só espaços vira `""` |
| `lineItems` | lista | não | só confere que é lista ao gravar (objeto: 500 depois de gravar o carrinho) | um item por produto encontrado |
| `createdAt` | data | não | inválida: 400 `createdAt must be a Date instance` | a data enviada; ausente, o momento do recebimento |
| `updatedAt` | data | não | inválida: 400 | ignorado; grava o momento do recebimento |

Total gravado: `subtotal - discount - shipping`. Se `discount` ou `shipping` estiver ausente
(não `null`, ausente), o total gravado é `0`.

Campos fora desta lista são aceitos e ignorados, sem erro.

## PUT /abandoned-carts/:id: corpo

Mesmo formato do POST sem `externalId` e `customerId`.

| Campo | Comportamento no PUT |
|---|---|
| `subtotal` | obrigatório (400 se ausente); total recalculado com `discount` e `shipping` |
| `discount`, `shipping` | ausentes: total gravado vira `0` |
| `url` | obrigatório na prática: ausente responde 500 e nada é alterado |
| `lineItems` | apaga os itens atuais e grava a lista enviada; ausente deixa o carrinho sem itens |
| `externalId`, `customerId`, `createdAt`, `updatedAt` | ignorados; os valores atuais continuam |

O `updatedAt` que volta na resposta do PUT pode ser o anterior. Para ver o valor gravado, faça
`GET /abandoned-carts/:id`.

## Item do carrinho (lineItems)

```json
{ "productId": "0d90ef24-2eff-42fa-8732-8cba125b9b8e", "quantity": 2 }
```

- `productId`: id Zoppy do produto (o `id` devolvido ao criar o produto). Com o `externalId` do
  produto ou um id inexistente, o item é descartado sem erro. Sem `productId`: 500, com o
  carrinho já gravado sem esse item e sem os seguintes.
- `quantity`: não validada. Negativa é gravada negativa, `"2"` vira `2`, ausente vira `null`.

## Resposta

Mesmo formato no POST, PUT, GET por id, GET por `externalId` e em cada item da listagem.

| Campo | Conteúdo |
|---|---|
| `id` | id Zoppy do carrinho (UUID) |
| `externalId` | seu id, ou `null` |
| `url` | link gravado |
| `total` | total gravado (`subtotal - discount - shipping` do envio) |
| `discount` | desconto gravado |
| `subtotal` | `total + discount`, não o subtotal enviado |
| `shipping` | sempre `0` |
| `createdAt`, `updatedAt` | ISO 8601 em UTC |
| `customerId`, `customer` | id e dados do cliente, com `address` |
| `lineItems` | itens com `id`, `quantity`, `productId`, `product` (id, externalId, name, price, status, categories) e `orderId` (que traz o id do carrinho) |

Exemplo lido de volta de um envio com `subtotal 100, discount 10, shipping 20`:
`"subtotal":80,"total":70,"discount":10,"shipping":0`.

## Listagem

`GET /abandoned-carts?after=2026-10-01&page=1&pageSize=50&updatedAt=2026-10-07`

| Parâmetro | Obrigatório | Regra |
|---|---|---|
| `after` | sim | carrinhos com `createdAt >= after`. Aceita `2026-10-01` ou data e hora com fuso. Ausente ou inválido: 422 `Invalid after date` |
| `page` | sim | a partir de 1. Ausente: 422 `Page parameter is required`; 0: 422 `Page needs to be bigger than 0` |
| `pageSize` | sim | de 1 a 50. Ausente: 422 `Page size parameter is required`; 51: 422 `Page size needs to be less than or equal 50` |
| `updatedAt` | não | carrinhos com `updatedAt >= updatedAt`. Inválido: 422 `Invalid updatedAt date` |

Resposta: `{"data":[...],"pagination":{"page":1,"pageSize":50,"totalRecords":5,"totalPages":1}}`.
Como `after` filtra pelo `createdAt`, um carrinho criado com `createdAt` antigo só aparece com
`after` anterior a essa data.

## Datas

- Mande ISO 8601 com fuso: `2026-10-01T10:00:00-03:00`. Volta em UTC:
  `2026-10-01T13:00:00.000Z`.
- Sem fuso (`2026-09-05 10:26`) a API aceita e lê como horário de Brasília:
  `2026-09-05T13:26:00.000Z`.
- A data é gravada em segundos inteiros: na leitura os milissegundos voltam `.000`.
