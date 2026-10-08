---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

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
- No PDV, cobra `minPurchaseValue` e a validade do cupom (são aplicados no checkout do
  parceiro).
