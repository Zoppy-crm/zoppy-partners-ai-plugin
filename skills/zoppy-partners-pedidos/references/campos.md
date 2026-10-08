# Campos do pedido

## Sumário

- Request do POST /orders
- Request do PUT /orders/{id}
- Objetos store e seller
- Itens (lineItems)
- Resposta
- Listagem

## Request do POST /orders

| Campo | Tipo | Obrigatório | O que a API faz |
|---|---|---|---|
| `externalId` | string | não, mas envie | Seu id do pedido. Repetido na conta responde 422 `External id already exists`. Sem ele, cada POST cria um pedido novo. Número JSON responde 400 |
| `customerId` | string | sim | Id da Zoppy do cliente. Ausente responde 400; inexistente, excluído ou com o `externalId` do cliente responde 422 `Customer not found` |
| `status` | string | sim | `completed`, `on-hold`, `canceled` ou `processing`, em minúsculas. Outro valor ou ausente: 422 `Invalid status`. `processing` é gravado como `on-hold` |
| `subtotal` | number | sim | Itens + frete, antes do desconto. Texto ou ausente: 400 |
| `discount` | number | não, mas envie | Desconto sobre os produtos. Ausente: total gravado 0 |
| `shipping` | number | não, mas envie | Frete cobrado. Frete grátis é 0. Ausente: total gravado 0 |
| `createdAt` | data | não, mas envie | Data da venda. Ausente: vira `completedAt` ou o momento do recebimento |
| `completedAt` | data | não | Data do pagamento ou confirmação. Gravada só com status `completed` |
| `lineItems` | array | não | Itens do pedido (veja abaixo) |
| `couponCode` | string | não | Código do cupom usado. Gravado como veio, exista ou não na conta |
| `storeId` | string | não | Id da Zoppy da loja. Inexistente ou inativa: 422 |
| `store` | objeto | não | Alternativa ao `storeId` (veja abaixo) |
| `userId` | string | não | Id de um usuário da conta como vendedor. Inexistente: ignorado |
| `seller` | objeto | não | Alternativa ao `userId` (veja abaixo) |
| `provider` | string | não | Texto livre, gravado e devolvido como veio |
| `createCoupon` | boolean | não | Aceito, sem efeito no pedido. Texto (`"true"`) responde 400 |
| `orderFromZoppy` | boolean | não | Aceito, sem efeito no pedido |
| `updatedAt` | data | não | Não é gravado: a Zoppy grava o momento da atualização. A resposta do PUT ecoa o valor enviado, mas o GET traz o gravado |

Campos fora desta lista (por exemplo `total` ou `items`) são ignorados sem erro.

## Request do PUT /orders/{id}

Os mesmos campos, menos `externalId` e `customerId`, que são ignorados se vierem. Obrigatórios: `status` e `subtotal`. Diferenças do POST:

| Campo | No PUT |
|---|---|
| `status` | `processing` fica `processing` |
| `discount`, `shipping` | Ausente: total gravado 0, e o campo ausente mantém o valor antigo |
| `createdAt` | Ausente: vira o `completedAt` enviado; sem os dois, mantém a data atual |
| `completedAt` | Status `completed` sem `completedAt`: mantém o anterior. Outro status: `null` |
| `lineItems` | Substitui todos os itens. Ausente: apaga todos |
| `couponCode` | Precisa existir na Zoppy, senão 422 `Coupon code not found` e nada é gravado, mesmo que o POST tenha aceitado o código. Ausente: mantém. `""`: apaga o cupom do pedido |
| `storeId`, `store` | Ausentes: mantém a loja |
| `userId`, `seller` | Ausentes ou sem correspondência: mantém o vendedor |
| `provider` | Ausente: mantém |

## Objetos store e seller

`store` (`{ "name", "externalId" }`) e `seller` (`{ "email", "revenueRecord", "phone" }`) são alternativas ao
`storeId` e ao `userId`. Regras de correspondência, prioridade e casos de borda: skills
`zoppy-partners-lojas` e `zoppy-partners-vendedores`.

## Itens (lineItems)

```json
"lineItems": [{ "productId": "33bc6edb-4f12-430a-ac86-0b9e26802028", "quantity": 2 }]
```

| Campo | Regra |
|---|---|
| `productId` | Id da Zoppy do produto. Inexistente, ou o `externalId` do produto: o item é descartado sem erro. Ausente: 400 `lineItems.0.productId must be a string` |
| `quantity` | Obrigatório, número, mínimo 0. Ausente ou texto: 400. Negativo: 400 `lineItems.0.quantity must not be less than 0`. Gravado como inteiro (1.5 vira 2) |

Não existe preço por item. Campos extras no item (`price`) são ignorados. O valor do pedido vem só de `subtotal`, `discount` e `shipping`.

## Resposta

POST, PUT e GET devolvem o mesmo formato:

| Campo | Conteúdo |
|---|---|
| `id` | Id da Zoppy do pedido (use no PUT e no DELETE) |
| `externalId` | Seu id |
| `status` | Status gravado |
| `total` | `subtotal - discount - shipping` enviados (produtos com desconto, sem frete) |
| `subtotal` | Recalculado: `total + discount + shipping` |
| `discount`, `shipping` | Gravados |
| `couponCode` | Código enviado |
| `couponUsed` | Dados do cupom de `couponCode`, se ele existir na conta; senão `null` |
| `couponCreated` | Cupom que a Zoppy gerou a partir do pedido (por exemplo giftback de uma automação da conta), enquanto ele estiver ativo; senão `null`. No POST e no PUT vem sempre `null` |
| `createdAt` | Data do pedido (UTC) |
| `completedAt` | Data de conclusão (UTC) ou `null` |
| `updatedAt` | Momento da última gravação |
| `customerId`, `customer` | Cliente com endereço. `customer` vira `null` se o cliente for excluído |
| `storeId` | Loja do pedido |
| `userId` | Vendedor ou `null` |
| `provider` | Como enviado |
| `lineItems` | Itens com `productId`, `quantity` e o `product` (nome, preço do cadastro, status) |

Na resposta do POST e do PUT, campos não enviados (`couponCode`, `userId`) podem faltar, o `total` pode vir com casas longas (`124.01999999999998`) e, sem `discount` ou `shipping`, `total` e `subtotal` vêm `null` (o GET traz `total` 0). Leia de volta com `GET /orders/{id}` para conferir.

## Listagem

`GET /orders?after=2026-09-01&page=1&pageSize=50` devolve `{ "data": [...], "pagination": { "page", "pageSize", "totalRecords", "totalPages" } }`. `after` filtra por `createdAt` maior ou igual: um pedido recebido hoje com `createdAt` de setembro não aparece em `after` de hoje. `updatedAt` (opcional) filtra também pela última gravação. Para um instante exato, envie `after` com hora e fuso (`2026-09-05T13:01:00Z`). Regras gerais de paginação estão na skill `zoppy-partners-api`.
