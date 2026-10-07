# Eval 02: frete grátis, cupom que zera os itens e pedido sem desconto

## Pedido do desenvolvedor (prompt)

> Preciso mapear três pedidos do meu e-commerce para a Partners API da Zoppy (cliente `{customerId}`,
> todos pagos, vendidos em 2026-10-01 às 15:00 de Brasília):
> A) itens R$ 50,00, cupom `CORTESIA` que deu 100% de desconto nos itens, e o frete de R$ 10,00 foi
>    zerado pelo mesmo cupom (o cliente não pagou nada);
> B) itens R$ 100,00, frete grátis, desconto de R$ 10,00;
> C) itens R$ 80,00, frete R$ 12,00, sem desconto.
> Monte os três payloads de POST /orders.

## Critérios de acerto (todos obrigatórios)

1. A: `subtotal` 50, `discount` 50, `shipping` **0**, `couponCode` "CORTESIA". Total esperado 0. Nunca `discount` 60 com `shipping` 10 (total negativo -20).
2. B: `subtotal` 100, `discount` 10, `shipping` 0. Total esperado 90.
3. C: `subtotal` **92** (80 + 12), `discount` **0** enviado explicitamente, `shipping` 12. Total esperado 80.
4. Os três com `status` `completed`, `createdAt` `2026-10-01T15:00:00-03:00` (ou equivalente com fuso) e `customerId`.
5. Nenhum payload com campo `total`.
6. Valida os três com `node scripts/validate.mjs --schema=pedido.create` e trata `ERRO` como bloqueio.

## Erros que reprovam

- Omitir `discount` (C) ou `shipping` (B): a API grava total 0.
- Somar o frete grátis no `subtotal` ou no `discount`.
