# Eval 02: reenviar carrinho que mudou, sem duplicar

## Pedido do desenvolvedor

> Meu sistema manda o carrinho abandonado para a Zoppy toda vez que ele muda (cliente adiciona ou tira item). Hoje o segundo envio dá erro 422 "External id already exists". Corrija a função `syncCart(cart)` para criar quando não existe e atualizar quando já existe. O `cart` tem `id`, `customerZoppyId`, `items[{zoppyProductId, qty}]`, `productsTotal`, `shipping`, `discount`, `recoveryUrl` e `abandonedAt` (ISO com fuso).

## Critérios de acerto

- Busca primeiro por `GET {base}/abandoned-carts/external/{cart.id}`; 404 significa criar, 200 significa atualizar.
- Cria com `POST /abandoned-carts` levando `externalId: cart.id`, `customerId`, `createdAt: cart.abandonedAt`.
- Atualiza com `PUT /abandoned-carts/{id}` usando o `id` Zoppy devolvido pela busca, não o `externalId`.
- No PUT manda `url` (sem ela a API responde 500), `subtotal`, `discount` e `shipping`, e a **lista completa** de `lineItems` (o PUT substitui os itens).
- `subtotal = productsTotal + shipping` nos dois casos; `discount` e `shipping` sempre presentes (0 quando não houver).
- Não manda `externalId`, `customerId` nem `createdAt` esperando que o PUT os altere.
- Valida o corpo com `--schema=carrinho.create` e `--schema=carrinho.update`.

## Reprova se

- Repetir o POST com outro `externalId` para "contornar" o 422 (duplica carrinhos).
- Mandar no PUT só os itens alterados.
- Omitir `url` no PUT.
