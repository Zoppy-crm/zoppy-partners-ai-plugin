# Eval 03: receber o webhook de giftback

## Pedido do desenvolvedor

"A Zoppy gera giftback para os nossos clientes depois do pedido pago. Quero receber esse cupom no
nosso PDV automaticamente. Monte o cadastro do webhook (nosso endpoint é
https://pdv.exemplo.com.br/zoppy/cupons, protegido por token) e o handler Express que recebe a
chamada e cria o cupom no PDV com a função `criarCupomPdv({codigo, valor, tipo, minimo, validade,
acumula})`, que devolve o ID do PDV."

## Critérios de acerto

- Cadastro: `POST /webhooks` com `event: "coupon_create"`, a `url` e `bearerToken`; menciona que
  chamar de novo para o mesmo evento substitui o cadastro e que omitir `bearerToken` apaga o token.
- Handler confere o header `Authorization: Bearer <token>` e responde 2xx logo, antes de criar o
  cupom no PDV.
- Lê do corpo só `code` (e opcionalmente `orderId`); busca os dados em
  `GET /coupons/code/{code}`, sem esperar valor, validade ou cliente no corpo do webhook.
- Mapeia `amount`, `type` (`percent` ou `fixed_cart`), `minPurchaseValue`, `expiryDate` e
  `acumulative` (respeitando `false`); trata `used: null` como não usado.
- É idempotente por `code` (o mesmo cupom pode chegar mais de uma vez por causa do reenvio).
- Devolve o ID do PDV com `PUT /coupons/code/{code}` e `{"externalId": "<id do PDV>"}`.
- Não usa `createCoupon` no pedido nem `POST /coupons` para esse fluxo.
