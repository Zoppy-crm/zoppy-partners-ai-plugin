# Erros e casos de borda de pedidos

## Sumário

- Formato do erro
- Erros 400 (tipo e formato)
- Erros 422 (regra de negócio)
- Erros 404
- Aceito com 200, mas gravado diferente

## Formato do erro

- **400**: `message` é uma **lista**, um item por campo. Ex.: `{"message":["subtotal must be a number conforming to the specified constraints","discount must be a number conforming to the specified constraints"],"error":"Bad Request","statusCode":400}`.
- **422**: `message` é **texto**. Quando mais de uma regra falha, saem juntas separadas por vírgula: `{"message":"Customer not found, Invalid status","error":"Unprocessable Entity","statusCode":422}`.
- Os erros 400 vêm antes dos 422: um payload com tipo errado e status inválido responde só o 400.

## Erros 400 (tipo e formato)

| Envio | Resposta |
|---|---|
| `subtotal` ausente ou `"100"` (texto) | `subtotal must be a number conforming to the specified constraints` |
| `discount: "0"` (texto) | `discount must be a number conforming to the specified constraints` |
| `customerId` ausente | `customerId must be a string` |
| `externalId: 123` (número) | `externalId must be a string` |
| `createdAt: "ontem"` | `createdAt must be a Date instance` |
| `createCoupon: "true"` (texto) | `createCoupon must be a boolean value` |
| `lineItems[0]` sem `productId` | `lineItems.0.productId must be a string` |
| `lineItems[0].quantity: -1` | `lineItems.0.quantity must not be less than 0` |
| `lineItems[0]` sem `quantity` ou `quantity: "2"` | `lineItems.0.quantity must not be less than 0` e `lineItems.0.quantity must be a number conforming to the specified constraints` |

## Erros 422 (regra de negócio)

| Situação | `message` |
|---|---|
| Status fora de `completed`, `on-hold`, `canceled`, `processing` (inclui `cancelled`, `Completed`, `pending`) ou ausente | `Invalid status` |
| `externalId` já usado por outro pedido da conta (POST) | `External id already exists` |
| `customerId` inexistente, de cliente excluído ou com o `externalId` do cliente (POST) | `Customer not found` |
| `storeId` que não existe na conta | `Store not found for this company (storeId: <id>)` |
| `storeId` de loja inativa | `Store "<nome>" is inactive and cannot receive orders (storeId: <id>). Reactivate it in the Zoppy panel, under the integration that owns this store.` |
| `couponCode` que não existe na conta (só no PUT) | `Coupon code not found` |
| PUT em pedido cujo cliente foi excluído | `Customer address not found` |

## Erros 404

| Situação | `message` |
|---|---|
| `GET /orders/{id}` ou `GET /orders/external/{externalId}` inexistente | `Order not found` |
| `DELETE /orders/{id}` inexistente ou já excluído | `Order not found` |
| `PUT /orders/{id}` inexistente | `Pedido não encontrado` |

## Aceito com 200, mas gravado diferente

São os casos que mais causam dado errado, porque não dão erro:

| Envio | O que acontece |
|---|---|
| `subtotal` só com os itens e `shipping > 0` | Frete sai do total: itens 131,60, frete 20, desconto 7,58 gravam 104,02 em vez de 124,02 |
| Frete grátis mandado como `shipping > 0` com desconto cobrindo tudo | Total negativo (ex.: `subtotal 50, discount 60, shipping 10` grava -20) |
| `discount` ou `shipping` ausente | Total gravado 0 |
| `total` no corpo | Ignorado |
| Sem `createdAt` | Data do pedido vira `completedAt` ou o momento do recebimento |
| Data sem fuso | Lida no horário de Brasília |
| `2026-09-05` (só a data) | Meia-noite UTC, 04/09 às 21h em Brasília |
| `05/09/2026` | Lido como 9 de maio |
| `status: processing` no POST | Gravado `on-hold` |
| `completedAt` com status diferente de `completed` | Descartado |
| `lineItems` com `productId` inexistente ou com o `externalId` do produto | Item descartado |
| `quantity: 1.5` | Gravado 2 |
| `items` em vez de `lineItems` | Ignorado: pedido sem itens |
| PUT sem `lineItems` | Todos os itens apagados |
| PUT sem `createdAt`, com `completedAt` | Data do pedido trocada pela do `completedAt` |
| `couponCode` de cupom existente com `discount: 0` | Zoppy preenche `discount` com o valor do cupom; `subtotal` lido de volta aumenta |
| `couponCode` inexistente no POST | Gravado como veio; `couponUsed` fica `null` |
| `userId` inexistente ou `seller` sem correspondência | Pedido sem vendedor |
| `store` sem correspondência | Pedido na loja padrão "Integrador Externo" |
| Sem `externalId` | Cada POST cria um pedido novo |
| PUT poucos segundos depois do POST do mesmo pedido | Às vezes desfeito pelo processamento do POST: o GET volta com os valores do POST. Leia de volta e reenvie |
