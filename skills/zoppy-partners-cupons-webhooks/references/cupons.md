# Cupons: respostas, erros e casos de borda

## Sumário

1. Resposta do cupom individual
2. Resposta do cupom compartilhado
3. Erros por endpoint
4. Casos de borda provados

## 1. Resposta do cupom individual

`GET /coupons/{id}`, `/code/{code}`, `/external/{externalId}`, `/phone/{phone}` e
`/order/{orderId}` devolvem:

| Campo | Observação |
|---|---|
| `id` | ID do cupom na Zoppy (UUID) |
| `externalId` | Seu ID (texto). `null` em cupom gerado pela Zoppy até você devolver o seu ID |
| `type` | `percent` ou `fixed_cart` |
| `code`, `amount`, `minPurchaseValue` | Como gravados |
| `expiryDate`, `startDate` | ISO 8601 em UTC. `startDate` é o momento do cadastro |
| `used` | `false` no cupom que você registra; `null` no cupom gerado pela Zoppy antes do uso; `true` depois do uso |
| `isValid` | `true` se não usado e `expiryDate` no futuro |
| `acumulative` | `true` no cupom que você registra; no gerado pela Zoppy vem da etapa do fluxo |
| `customer` | Cliente com o mesmo telefone, se existir (ausente na resposta do `POST`) |
| `createdAt`, `updatedAt` | ISO 8601 em UTC |

Número enviado como texto (`"amount": "15.90"`) é aceito; a resposta do `POST` repete o texto e
as consultas devolvem número (`15.9`). Com `externalId` numérico no individual é o contrário: a
resposta do `POST` repete o número e as consultas devolvem texto (`987654` vira `"987654"`).
Telefone enviado como número JSON é aceito e gravado só com os dígitos.

## 2. Resposta do cupom compartilhado

Mesmos campos, sem `used`, `acumulative` e `customer`, e com `usageLimit` (número). `isValid`
considera só a validade. `externalId` volta como número.

## 3. Erros por endpoint

| Chamada | Status | `message` |
|---|---|---|
| `POST /coupons` ou `/coupons/shared` sem `amount` ou com `amount` 0 (número) | 422 | `O valor do cupom deve ser informada.` (`"0"` em texto e negativo são gravados) |
| `POST /coupons` ou `/coupons/shared` sem `code` | 422 | `O código do cupom deve ser informado.` |
| `POST /coupons` ou `/coupons/shared` sem `externalId` ou com `externalId` 0 | 422 | `O Id externo do cupom deve ser informado.` |
| `POST /coupons` sem `phone` ou com menos de 10 dígitos | 422 | `O número de celular do cupom é invalido.` |
| `POST` com `type` texto fora de `percent`/`fixed_cart` (ex. `"xyz"`) | 422 | `O tipo do cupom é inválido.` (`"0"`, `"1"` e `0` passam e são gravados) |
| `POST` com `code` já usado (individual ou compartilhado) | 422 | `O código do coupon já está sendo utilizado` |
| Vários erros juntos | 422 | Mensagens separadas por vírgula em uma string |
| `GET /coupons/...` sem resultado | 404 | `Coupon not found` |
| `GET /coupons/phone/{phone}/many` sem resultado | 200 | `[]` |
| `PUT /coupons/...` sem cupom individual correspondente | 422 | `Coupon not found` |
| `PUT /coupons/phone/{phone}` com telefone inválido | 422 | `O número de celular null informado é inválido.` |
| `DELETE /coupons/{id}`, `/code/{code}` ou `/externalId/{externalId}` inexistente | 422 | `O cupon informado não existe` |
| `DELETE /coupons/externalId/{externalId}` de cupom usado | 404 | `Coupon not found` |
| `DELETE /coupons/phone/{phone}` com telefone válido sem cupom | 422 | `O cupon informado não existe` |
| `DELETE /coupons/phone/{phone}` com telefone inválido | 422 | `O número celular do cupom é inválido., O cupon informado não existe` |

## 4. Casos de borda provados

- Busca por `externalId` olha primeiro os individuais e depois os compartilhados. Como o
  compartilhado guarda `externalId` como inteiro, enquanto existir um compartilhado com
  `externalId` `0` na conta, buscar por um texto que não existe nos individuais devolve esse
  compartilhado. Sem ele, a busca dá 404.
- `externalId` não é único: dois compartilhados com o mesmo número são aceitos, e um individual e
  um compartilhado com o mesmo valor também; a busca devolve o individual.
- "Mais recente" (em `GET /coupons/phone/{phone}`, `PUT /coupons/phone/{phone}` e no cupom
  aguardando da regra 1) segue a data de criação, que é gravada com precisão de segundo
  (`createdAt` volta `...:45.000Z`). Dois cupons do mesmo telefone criados no mesmo segundo
  empatam e qualquer um pode ser o escolhido.
- `GET /coupons/phone/{phone}` devolve o cupom individual não usado e não vencido mais recente
  daquele telefone, incluindo giftback gerado pela Zoppy.
- `PUT /coupons/phone/{phone}` atualiza esse mesmo cupom (o mais recente não usado do telefone).
- `PUT /coupons/code/{code}` com `{"externalId": "novo"}` troca o seu ID; a busca pelo ID antigo
  deixa de achar o cupom.
- Cupom usado (`used: true`) volta com `isValid: false`.
- Cupom gerado por fluxo de automação não fica aguardando pedido (um pedido seguinte sem
  `couponCode` não o recebe) e não aparece em `GET /coupons/external/null`. Depois de baixado por
  `couponCode`, sai das buscas por telefone (404) e não é aplicado a um pedido seguinte.
- Pedido com `couponCode` de cupom individual existente marca o cupom como usado e, se o pedido
  veio com `discount` 0, a Zoppy grava o desconto calculado pelo cupom (10% de 50 vira 5).
- Com `awaitingOrder` `true`, um pedido do mesmo telefone sem `couponCode` recebe o cupom
  aguardando mais recente, sem conferir validade nem uso: no teste, um cupom com data inválida
  foi consumido no lugar de um válido mais antigo, e um cupom já usado foi aplicado a um segundo
  pedido. `PUT {"used": true, "awaitingOrder": false}` impede isso.
