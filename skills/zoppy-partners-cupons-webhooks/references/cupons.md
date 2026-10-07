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
as consultas devolvem número (`15.9`). `externalId` numérico no individual volta como texto
(`987654` vira `"987654"`).

## 2. Resposta do cupom compartilhado

Mesmos campos, sem `used`, `acumulative` e `customer`, e com `usageLimit` (número). `isValid`
considera só a validade. `externalId` volta como número.

## 3. Erros por endpoint

| Chamada | Status | `message` |
|---|---|---|
| `POST /coupons` sem `amount` ou com `amount` 0 | 422 | `O valor do cupom deve ser informada.` |
| `POST /coupons` ou `/coupons/shared` sem `code` | 422 | `O código do cupom deve ser informado.` |
| `POST /coupons` ou `/coupons/shared` sem `externalId` | 422 | `O Id externo do cupom deve ser informado.` |
| `POST /coupons` sem `phone` ou com menos de 10 dígitos | 422 | `O número de celular do cupom é invalido.` |
| `POST` com `type` fora de `percent`/`fixed_cart` | 422 | `O tipo do cupom é inválido.` |
| `POST` com `code` já usado (individual ou compartilhado) | 422 | `O código do coupon já está sendo utilizado` |
| Vários erros juntos | 422 | Mensagens separadas por vírgula em uma string |
| `GET /coupons/...` sem resultado | 404 | `Coupon not found` |
| `GET /coupons/phone/{phone}/many` sem resultado | 200 | `[]` |
| `PUT /coupons/...` sem cupom individual correspondente | 422 | `Coupon not found` |
| `PUT /coupons/phone/{phone}` com telefone inválido | 422 | `O número de celular null informado é inválido.` |
| `DELETE /coupons/{id}`, `/code/{code}` ou `/externalId/{externalId}` inexistente | 422 | `O cupon informado não existe` |
| `DELETE /coupons/externalId/{externalId}` de cupom usado | 404 | `Coupon not found` |
| `DELETE /coupons/phone/{phone}` com telefone inválido | 422 | `O número celular do cupom é inválido., O cupon informado não existe` |

## 4. Casos de borda provados

- Busca por `externalId` olha primeiro os individuais e depois os compartilhados. Como o
  compartilhado guarda `externalId` como inteiro, buscar por um texto que não existe nos
  individuais pode devolver um compartilhado cujo `externalId` virou `0`.
- `GET /coupons/phone/{phone}` devolve o cupom individual não usado e não vencido mais recente
  daquele telefone, incluindo giftback gerado pela Zoppy.
- `PUT /coupons/phone/{phone}` atualiza esse mesmo cupom (o mais recente não usado do telefone).
- `PUT /coupons/code/{code}` com `{"externalId": "novo"}` troca o seu ID; a busca pelo ID antigo
  deixa de achar o cupom.
- Cupom usado (`used: true`) volta com `isValid: false`.
- Pedido com `couponCode` de cupom individual existente marca o cupom como usado e, se o pedido
  veio com `discount` 0, a Zoppy grava o desconto calculado pelo cupom (10% de 50 vira 5).
- Com `awaitingOrder` `true`, um pedido do mesmo telefone sem `couponCode` recebe o cupom
  aguardando mais recente, sem conferir validade: no teste, um cupom com data inválida foi
  consumido no lugar de um válido mais antigo.
