# Erros e casos de borda do carrinho abandonado

## Sumário

- Formato dos erros
- Erros por operação
- Aceito, mas gravado diferente do esperado
- 500 que deixa dado gravado

## Formato dos erros

- **400**: falha de tipo ou campo obrigatório. `message` é uma **lista**, uma frase por campo:
  `{"message":["customerId must be a string","subtotal must be a number conforming to the specified constraints"],"error":"Bad Request","statusCode":400}`
- **422**: regra de negócio. `message` é **texto**; várias regras vêm juntas separadas por `, `:
  `{"message":"External id already exists, Abandoned Cart URL is required., Customer not found","error":"Unprocessable Entity","statusCode":422}`
- **404**: `{"message":"Abandoned Cart not found","error":"Not Found","statusCode":404}`
- **500**: `{"statusCode":500,"message":"Internal server error"}`, sem detalhe.

Trate `message` como lista ou texto conforme o status.

## Erros por operação

| Operação | Causa | Status | message |
|---|---|---|---|
| POST | `customerId` ausente ou não string | 400 | `customerId must be a string` |
| POST, PUT | `subtotal` ausente (no POST, também string) | 400 | `subtotal must be a number conforming to the specified constraints` |
| POST | `discount` ou `shipping` string | 400 | `discount must be a number ...` / `shipping must be a number ...` |
| POST | `externalId` número | 400 | `externalId must be a string` |
| POST | `url` número | 400 | `url must be a string` |
| POST, PUT | `createdAt` ou `updatedAt` inválido | 400 | `createdAt must be a Date instance` / `updatedAt must be a Date instance` |
| POST | `url` ausente ou `""` | 422 | `Abandoned Cart URL is required.` |
| POST | cliente não existe na conta | 422 | `Customer not found` |
| POST | `externalId` já usado por carrinho não excluído | 422 | `External id already exists` |
| GET, PUT, DELETE | id inexistente ou já excluído (no GET, também id que não é UUID) | 404 | `Abandoned Cart not found` |
| GET external | `externalId` inexistente | 404 | `Abandoned Cart not found` |
| GET lista | `after` ausente ou inválido | 422 | `Invalid after date` |
| GET lista | `page` ausente ou não numérico / menor que 1 | 422 | `Page parameter is required` / `Page needs to be bigger than 0` |
| GET lista | `pageSize` ausente / 0 / maior que 50 | 422 | `Page size parameter is required` / `Page size needs to be bigger than 0` / `Page size needs to be less than or equal 50` |
| GET lista | `pageSize` decimal (`1.5`) | 500 | sem detalhe |
| GET lista | `updatedAt` inválido | 422 | `Invalid updatedAt date` |
| PUT | `url` ausente | 500 | sem detalhe; nada é alterado |
| POST, PUT | `lineItems` que não é lista, item `null` ou sem `productId` | 500 | sem detalhe; já gravou (ver abaixo) |

## Aceito, mas gravado diferente do esperado

Estes casos respondem 200. O validador da skill acusa os que dá para ver no corpo (todos, menos o subtotal sem frete).

| Envio | O que acontece |
|---|---|
| sem `discount` ou sem `shipping` | total gravado `0`; a resposta do POST/PUT traz `total` e `subtotal` `null`; no PUT sem `discount` o desconto anterior fica |
| `discount` negativo | total gravado maior que o `subtotal` (`subtotal 120, discount -10, shipping 0` grava `130`) |
| `subtotal` menor que `discount + shipping` | total gravado negativo (ex. `subtotal 10, discount 20` grava `-10`) |
| `subtotal` sem o frete | total gravado fica menor que o valor dos produtos com desconto |
| `url` só com espaços (POST), ou `""`/só espaços (PUT) | gravada `""`: carrinho sem link de recuperação |
| item com `externalId` do produto, id inexistente ou `productId` `null` | item descartado |
| `lineItems` `null` ou `""` | carrinho sem itens |
| `quantity` fora do esperado | `-3` fica `-3`; `"2"` vira `2`; `"abc"` vira `0`; `1.5` vira `2`; ausente vira `null` (veja pelo GET) |
| `updatedAt` no POST | ignorado |
| `externalId`, `customerId`, `createdAt` (válido) no PUT | ignorados |
| PUT sem `lineItems` | carrinho fica sem itens |
| campo desconhecido | ignorado |
| data e hora sem fuso | lida como horário de Brasília; só a data vira meia-noite UTC |
| sem `externalId` | cada POST cria um carrinho novo |

## 500 que deixa dado gravado

| Envio | Estado depois do 500 |
|---|---|
| POST com `lineItems` objeto, texto ou número | carrinho criado, sem itens |
| POST com item `null` ou sem `productId` | carrinho criado só com os itens anteriores a ele |
| PUT com `lineItems` objeto | `url`, `subtotal`, `discount` e total já trocados; itens antigos apagados; carrinho sem itens |
| PUT com item sem `productId` | idem, ficando só os itens anteriores a ele |

No POST, o carrinho criado assim segue para a recuperação como qualquer outro, e reenviar com o
mesmo `externalId` responde 422 `External id already exists`. Recupere com
`GET /abandoned-carts/external/:externalId` e corrija com `PUT /abandoned-carts/:id` mandando a
lista completa de itens. No PUT, refaça o PUT com a lista certa.
