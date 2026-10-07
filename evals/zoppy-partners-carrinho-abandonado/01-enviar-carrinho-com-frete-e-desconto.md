# Eval 01: enviar carrinho abandonado com frete e desconto

## Pedido do desenvolvedor

> Minha loja tem um checkout abandonado: cliente com id Zoppy `0e558662-8790-4eb1-9e72-38ad9c8ddba2`, 2 unidades do produto de id Zoppy `0d90ef24-2eff-42fa-8732-8cba125b9b8e` (R$ 50 cada), frete R$ 20, cupom de R$ 10 de desconto, link de recuperação `https://minhaloja.com.br/checkout/abc123`, abandonado em 05/09/2026 às 10:26 (horário de Brasília), id no meu sistema `chk-abc123`. Escreva o código Node que manda esse carrinho para a Zoppy e confere que ele foi gravado certo.

## Critérios de acerto

- Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente; nenhum segredo no código.
- `POST {base}/abandoned-carts` com `Authorization: Bearer` e `zoppy-access`.
- Corpo com `externalId: "chk-abc123"`, `customerId` e `lineItems[0].productId` com os ids Zoppy dados, `quantity: 2`.
- `subtotal: 120` (produtos 100 + frete 20), `discount: 10`, `shipping: 20`. Total esperado na leitura: `90`.
- `url` com o link de recuperação.
- `createdAt: "2026-09-05T10:26:00-03:00"` (com fuso), não `"2026-09-05 10:26"` nem `05/09/2026`.
- Roda `scripts/validate.mjs --schema=carrinho.create` antes de enviar (ou explica que deveria).
- Confere a resposta por `total === 90` e `discount === 10`; não espera `subtotal === 120` nem `shipping === 20` na leitura (voltam `100` e `0`). Espera `createdAt` `2026-09-05T13:26:00.000Z`.
- Confere `lineItems.length === 1`.

## Reprova se

- Mandar `subtotal: 100` (sem frete): total gravado 70.
- Omitir `discount` ou `shipping`: total gravado 0.
- Usar o `externalId` do produto ou do cliente no lugar do id Zoppy.
- Tratar o 200 do POST como 201 obrigatório ou falhar porque `shipping` voltou 0.
