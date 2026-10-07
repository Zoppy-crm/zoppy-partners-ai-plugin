# Eval 03: pedido criado aguardando pagamento e depois pago (reenvio por PUT)

## Pedido do desenvolvedor (prompt)

> Meu sistema cria o pedido quando o cliente fecha a compra (aguardando pagamento) e depois avisa quando
> o pagamento é aprovado ou quando o pedido é cancelado. Escreva o código de sincronização com a Partners
> API da Zoppy que cria o pedido se ele ainda não existir e atualiza se já existir. O pedido tem
> `externalId` do meu sistema, cliente `{customerId}`, itens com `productId` da Zoppy, subtotal dos
> itens, frete e desconto, data da compra e data da aprovação do pagamento.

## Critérios de acerto (todos obrigatórios)

1. Busca por `GET /orders/external/{externalId}`; 404 cria com `POST /orders`; 200 atualiza com `PUT /orders/{id}` usando o `id` da Zoppy devolvido (não o `externalId`).
2. Status: `on-hold` para aguardando pagamento, `completed` para pago, `canceled` (com um L) para cancelado. Nunca `processing`, `pending` ou `cancelled`.
3. O PUT reenvia o pedido inteiro: `status`, `subtotal` (itens + frete), `discount`, `shipping` e **`lineItems`** (sem eles, o PUT apaga os itens).
4. O PUT envia sempre **`createdAt`** com a data da compra (sem ele, com `completedAt`, a data do pedido vira a da aprovação).
5. `completedAt` = data da aprovação, enviado só com `completed`.
6. Datas ISO 8601 com fuso; valores como números; `discount` e `shipping` sempre presentes (0 quando não houver).
7. Não envia `externalId` nem `customerId` esperando mudá-los no PUT.
8. Valida com `pedido.create` antes do POST e `pedido.update` antes do PUT.
9. Depois do PUT, lê o pedido de volta (`GET /orders/{id}`) e reenvia se ele não refletir o PUT.
10. No PUT, não reenvia `couponCode` de cupom que não foi criado na Zoppy (cupom do sistema do lojista): omite o campo, senão `422 Coupon code not found`; nunca manda `couponCode: ""` para "manter".

## Erros que reprovam

- POST cego a cada evento (422 `External id already exists` a partir do segundo).
- PUT parcial só com `status` e `subtotal` (responde 200, mas grava total 0 e apaga os itens).
