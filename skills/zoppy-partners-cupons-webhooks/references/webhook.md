# Webhook coupon_create

## Sumário

1. Quando a Zoppy chama a sua URL
2. Cadastro
3. O que chega
4. Falha e reenvio
5. Roteiro de recebimento
6. Quando nada chega

## 1. Quando a Zoppy chama a sua URL

O evento `coupon_create` sai quando a Zoppy gera um cupom, por exemplo pela etapa de criar cupom
de um fluxo de automação (um giftback depois de um pedido `completed`). Não sai quando você
registra um cupom com `POST /coupons` ou `POST /coupons/shared`, e não depende do campo
`createCoupon` do pedido. O fluxo de automação é configurado no painel da Zoppy, não pela API.

## 2. Cadastro

| Chamada | Corpo | Resultado |
|---|---|---|
| `POST /webhooks` | `{"event":"coupon_create","url":"https://...","bearerToken":"..."}` | 200 com o cadastro (`id`, `event`, `url`, `bearerToken`, `userId`, `companyId`, datas) |
| `POST /webhooks` de novo, mesmo evento | idem | Mesmo `id`; `url` e `bearerToken` substituídos (ausente apaga o token) |
| `GET /webhooks` | | Lista dos cadastros da conta, `[]` se nenhum |
| `PUT /webhooks/{id}` | `event` e `url` obrigatórios, `bearerToken` opcional | 200 com o cadastro atualizado |
| `DELETE /webhooks/{id}` | | 200 `{"result":true}`; some da lista |

Erros: `event` ausente ou diferente de `coupon_create` dá 422 `Tipo de evento inválido`; `url`
ausente dá 422 `URL obrigatória`; `url` que não é texto dá 400 `["url must be a string"]`. A
`url` é gravada com até 255 caracteres: acima disso é cortada sem aviso (a resposta
do `POST` mostra a inteira, `GET /webhooks` mostra a cortada); `id` inexistente em `PUT` ou `DELETE` dá 404
`Configuração de webhook não encontrada`. O cadastro vale para a conta do token usado; cada conta
precisa do seu.

## 3. O que chega

```http
POST <url cadastrada>
Content-Type: application/json
Authorization: Bearer <bearerToken>

{ "code": "GBK7Q2XH", "id": "8f1c2d3e-0000-4a5b-9c6d-1e2f3a4b5c6d", "orderId": "2b7e9a10-0000-4c3d-8e5f-6a7b8c9d0e1f", "companyId": "5c0d1e2f-0000-4a1b-8c2d-3e4f5a6b7c8d" }
```

| Campo | Significado |
|---|---|
| `code` | Código do cupom |
| `id` | ID do cupom na Zoppy, o mesmo de `GET /coupons/{id}` |
| `orderId` | ID do pedido na Zoppy que originou o cupom; ausente quando o cupom não veio de um pedido |
| `companyId` | ID da conta na Zoppy |

`Authorization` só vai se o cadastro tem `bearerToken`. Valor, validade, mínimo e cliente não
vêm no corpo.

## 4. Falha e reenvio

Resposta fora de 2xx ou falha de conexão contam como falha. A Zoppy tenta de novo em intervalos
crescentes a partir de cerca de 2 segundos, até 10 tentativas. Por isso o mesmo `code` pode
chegar mais de uma vez: trate `code` como chave de idempotência e responda 2xx para um `code` que
você já processou. Responda 2xx assim que receber e processe depois.

## 5. Roteiro de recebimento

1. Responda 2xx.
2. `GET /coupons/code/{code}` (ou `GET /coupons/order/{orderId}`) para ler `amount`, `type`,
   `minPurchaseValue`, `expiryDate`, `acumulative`, `isValid` e `customer`. O cupom já está
   disponível nessas consultas segundos depois do pedido que o gerou.
3. Crie o cupom no seu sistema com esses valores. `acumulative: false` significa não combinar com
   outras promoções. `used: null` significa não usado. Mínimo de compra e validade são aplicados
   no seu checkout: faça-o cobrar `minPurchaseValue` e a validade.
4. Devolva o seu ID: `PUT /coupons/code/{code}` com `{"externalId":"<seu id>"}`.
5. Quando o cliente usar o cupom, mande o pedido com `couponCode` (skill zoppy-partners-pedidos).

## 6. Quando nada chega

- `GET /webhooks` vazio: não há URL cadastrada nessa conta.
- `GET /coupons/order/{orderId}` com 404: o fluxo não gerou cupom para esse pedido; confira o
  fluxo de automação no painel, não a API. `GET /coupons-config` não decide isso.
- O cupom existe e a URL está cadastrada: o problema está na entrega até a sua URL (rede,
  certificado, status de resposta).
