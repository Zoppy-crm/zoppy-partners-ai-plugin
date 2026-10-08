---
name: zoppy-partners-cupons-webhooks
description: "Registra na Partners API da Zoppy o cupom criado no sistema do parceiro (POST /coupons individual ligado a telefone, POST /coupons/shared compartilhado com limite de uso), busca, atualiza e exclui cupom, lê o cupom que um fluxo de automação da Zoppy gerou para um pedido (giftback) e cadastra a URL que recebe o webhook coupon_create. Use ao gerar código de cupom, ao depurar 422 de cupom (código já usado, Id externo, celular inválido), cupom compartilhado achado pelo externalId errado, cupom baixado sozinho por um pedido, webhook que não chega ou bearerToken. Gatilhos: cupom Zoppy, giftback, coupon_create, webhook Zoppy, cupom compartilhado, couponCode, coupons-config; em inglês: Zoppy coupon, shared coupon, coupon webhook, giftback webhook. Não use para autenticação, paginação e formato de erro (zoppy-partners-api) nem para montar o pedido que usa o cupom (zoppy-partners-pedidos)."
---

# Cupons e webhooks na Partners API da Zoppy

**Regras fixas desta skill** (valem em toda tarefa, mesmo curta):
1. Rode `scripts/validate.mjs` (`cupom.create`, `cupom-compartilhado.create` ou `webhook.create`) em todo corpo antes de enviar, e leia cada `ERRO` e `AVISO`.
2. Em teste, o `code` (e o `externalId` do cupom individual) leva o prefixo do usuário inteiro, sem abreviar.
3. Nunca invente dado que o usuário não deu: sem compra mínima, mande `minPurchaseValue: 0`; sem validade definida, pergunte.
4. Em `phone`, use o telefone que a Zoppy devolveu no cadastro do cliente (`customer.phone`), não o que você enviou.
5. Releia com `GET /coupons/code/{code}` o que gravou; na limpeza, apague também os cupons que as automações criaram (`GET /coupons/order/{id}`).

## Antes de gerar código

1. Autenticação, URLs base e formato de erro estão na skill zoppy-partners-api. Credenciais: leia
   `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` só dentro do código. Nunca imprima,
   ecoe ou liste o ambiente (`env`, `printenv`, `echo $ZOPPY_...`) nem cole os valores em arquivo, log ou
   resposta; para conferir se existem, teste só a presença (`process.env[k] ? 'definida' : 'AUSENTE'`), sem
   mostrar o valor.
2. Todo corpo de criação de cupom ou webhook passa pelo validador desta skill antes de ser enviado ou
   de entrar no código que você devolve:
   ```bash
   node scripts/validate.mjs --schema=cupom.create '<json>'
   node scripts/validate.mjs --schema=cupom-compartilhado.create '<json>'
   node scripts/validate.mjs --schema=webhook.create '<json>'
   ```
   Execute o validador, sem precisar ler o código dele (Node 18 ou mais novo, sem dependências).
   `scripts/validate.mjs` fica na pasta desta skill (a pasta deste SKILL.md), não no projeto em que você
   trabalha: rode o comando de dentro dela ou troque `scripts/` pelo caminho completo (no Claude Code,
   `${CLAUDE_SKILL_DIR}/scripts/validate.mjs`). Saída `0` sem `ERRO` (pode ter `AVISO`), `1` com `ERRO`, `2`
   uso incorreto. `--file=<caminho>` lê o payload de um arquivo, `--json` devolve o resultado para máquina e
   `--help` mostra o uso. Leia também os avisos: quase todo campo de cupom tem um padrão que só aparece quando
   você não manda o campo.
3. Mande sempre `externalId`, `type`, `minPurchaseValue`, `expiryDate` e, no individual,
   `awaitingOrder`. Os padrões da Zoppy para esses campos raramente são o que você quer.
4. Dado criado em teste ou só para ver a resposta leva o prefixo definido pelo usuário e é apagado no fim
   (regra em `zoppy-partners-api`), inclusive os cupons gerados pelas automações da conta (abaixo).

## Dois fluxos de cupom

| Fluxo | Quem cria | O que você faz |
|---|---|---|
| A. Zoppy cria e avisa você | Um fluxo de automação da Zoppy com a etapa de criar cupom (por exemplo, giftback depois de um pedido `completed`) | Cadastra uma URL em `POST /webhooks`, recebe `coupon_create`, busca o cupom em `GET /coupons/code/{code}` e cria o cupom no seu sistema |
| B. Você cria e registra na Zoppy | O seu sistema | Chama `POST /coupons` (individual) ou `POST /coupons/shared` (compartilhado) |

Um cupom registrado por você (fluxo B) não dispara o webhook `coupon_create`: você não recebe de
volta o cupom que você mesmo mandou. O campo `createCoupon` do pedido não cria cupom: quem gera o
cupom do fluxo A é o fluxo de automação configurado no painel da Zoppy, não a API.

**Automações da conta ao testar.** Pedido `completed`, e também pedido em outro status se a conta
tiver fluxo para ele (por exemplo, `on-hold`), pode disparar um fluxo que cria cupom ou giftback
para o telefone do cliente, segundos depois do pedido. Ao testar com pedidos, liste esses cupons
(`GET /coupons/order/{orderId}` de cada pedido, ou `GET /coupons/phone/{phone}/many`) e apague-os na
limpeza, junto com os cupons que você criou.

## Endpoints

| Método e rota | Para quê |
|---|---|
| `POST /coupons` | Registrar cupom individual (ligado a um telefone) |
| `POST /coupons/shared` | Registrar cupom compartilhado (sem cliente, com limite de uso) |
| `GET /coupons/{id}`, `GET /coupons/code/{code}`, `GET /coupons/external/{externalId}` | Buscar um cupom, individual ou compartilhado |
| `GET /coupons/order/{orderId}` | Cupom que a Zoppy gerou a partir de um pedido |
| `GET /coupons/phone/{phone}` | Cupom individual não usado e não vencido mais recente do telefone |
| `GET /coupons/phone/{phone}/many` | Todos os cupons individuais não usados e não vencidos do telefone (lista, `[]` se nenhum) |
| `PUT /coupons/{id}`, `/code/{code}`, `/externalId/{externalId}`, `/phone/{phone}` | Atualizar cupom individual |
| `DELETE /coupons/{id}`, `/code/{code}`, `/externalId/{externalId}`, `/phone/{phone}` | Excluir cupom |
| `GET /webhooks`, `POST /webhooks`, `PUT /webhooks/{id}`, `DELETE /webhooks/{id}` | Cadastro da URL do webhook |
| `GET /coupons-config` | Parâmetros de giftback da conta (só leitura) |

Todas as criações e atualizações respondem 200 (não 201). Erros de regra de cupom e webhook
voltam 422 com a mensagem em `message`; busca sem resultado volta 404 `Coupon not found`.

## Cupom individual (`POST /coupons`)

| Campo | Tipo | Obrigatório | Se não vier |
|---|---|---|---|
| `code` | string | sim | 422 `O código do cupom deve ser informado.` |
| `amount` | número maior que zero | sim | 422 `O valor do cupom deve ser informada.` (também com `0` número) |
| `phone` | string, 10 dígitos ou mais | sim | 422 `O número de celular do cupom é invalido.` |
| `externalId` | string, até 255 caracteres | sim (`0` conta como ausente) | 422 `O Id externo do cupom deve ser informado.` |
| `type` | `percent` ou `fixed_cart` | não | `fixed_cart`; um texto como `"xyz"` dá 422 `O tipo do cupom é inválido.` |
| `minPurchaseValue` | número | não | `0` em `percent`; o próprio `amount` em `fixed_cart` |
| `expiryDate` | data ISO 8601 com fuso | não | `2100-01-01T00:00:00.000Z` |
| `awaitingOrder` | boolean | não | `true` (veja as regras abaixo) |

- `code` é único entre os cupons não excluídos da conta, somando individuais e compartilhados:
  repetido dá 422 `O código do coupon já está sendo utilizado`. Depois que um cupom é excluído, o
  código pode ser usado de novo.
- A API não confere tudo: `amount` `"0"` (texto) ou negativo é gravado assim, e `type` `"0"`,
  `"1"` ou `0` passa e é gravado com esse valor. Mande `amount` número maior que zero e `type`
  só `percent` ou `fixed_cart`.
- `externalId` não é único: a Zoppy aceita o mesmo valor em mais de um cupom. Na busca por
  `externalId`, um cupom individual vem antes de um compartilhado com o mesmo valor.
- Ignorados neste endpoint: `usageLimit` (o individual sempre tem um uso), `usageLimitPerUser` e
  `description` (não são gravados).
- A resposta do `POST` não traz `customer`; as buscas trazem `customer` quando existe um cliente
  com o mesmo telefone. Cadastre o cliente antes (skill zoppy-partners-clientes).
- A leitura (`GET /coupons/...`) não devolve `phone` nem `awaitingOrder`. Para conferir o vínculo
  com o cliente, use `customer` da resposta ou `GET /coupons/phone/{phone}/many`; `awaitingOrder`
  não é legível pela API, então confie no valor que você enviou.
- `acumulative` (se combina com outras promoções) volta sempre `true` no cupom que você registra.

Corpo recomendado:

```json
{
  "externalId": "cupom-123",
  "code": "VOLTE20",
  "phone": "11987654321",
  "type": "fixed_cart",
  "amount": 20,
  "minPurchaseValue": 100,
  "expiryDate": "2026-12-31T23:59:59-03:00",
  "awaitingOrder": false
}
```

## Cupom compartilhado (`POST /coupons/shared`)

Mesmos campos, com estas diferenças:

- Sem cliente: `phone` é ignorado e o cupom não aparece nas buscas por telefone. A resposta não
  tem `used`, `acumulative` nem `customer`, e tem `usageLimit`.
- `usageLimit` é respeitado. Sem ele, o cupom aceita um único uso.
- `externalId` é guardado como número inteiro; mande de 1 a 2147483647 (`0` dá 422 como ausente). Veja a regra 3.
- `amount` é guardado arredondado para inteiro: `12.75` vira `13` e `12.5` vira `12` nas
  consultas (a resposta do `POST` ainda mostra o valor enviado).
- `PUT /coupons/...` não atualiza compartilhado (422 `Coupon not found`) e
  `DELETE /coupons/externalId/{id}` não o encontra. Exclua pelo `id` ou pelo `code`.

## Regras que mais causam erro

**1. `awaitingOrder` ausente vale `true`: registre `false` se o resgate é pelo código.**
Com `awaitingOrder` ligado, o próximo pedido do mesmo telefone que chegar sem `couponCode` recebe
o cupom mais recente desse telefone que ainda tem `awaitingOrder` ligado: o pedido ganha o
`couponCode`, o cupom vira `used: true` e, se o pedido veio com `discount` 0, a Zoppy preenche o
desconto pelo cupom. Dois casos em que o mesmo cupom desconta duas vezes:
- você marca o cupom como usado com `PUT {"used": true}`: ele continua aguardando e o próximo
  pedido sem código recebe esse cupom de novo;
- o cupom é baixado por `couponCode` enquanto há um cupom mais novo aguardando no mesmo telefone:
  o pedido seguinte sem código recebe o mais novo, e o outro depois dele.

Como evitar: registre com `"awaitingOrder": false` o cupom que só deve ser baixado pelo código;
para baixar à mão, mande `PUT {"used": true, "awaitingOrder": false}`. Nos dois casos, um pedido
sem código chegou depois e não recebeu o cupom.

**2. O telefone é gravado como veio.** `"+55 (11) 98765-4321"` fica gravado assim, e
`GET`/`PUT`/`DELETE /coupons/phone/{phone}` só acham o cupom com o mesmo texto. Mande só dígitos
e consulte com os mesmos dígitos. Use o telefone que a Zoppy devolveu no cadastro do cliente
(`customer.phone`): no cliente ela acrescenta o 9 em celular de 8 dígitos, no cupom não.

**3. No compartilhado, `externalId` texto não é preservado.** O texto vira o número do começo
dele (`"123abc"` vira `123`) ou `0` se não começa com dígito, sempre com resposta 200. No
compartilhado o identificador é numérico e não é único: consulte o compartilhado pelo `code`.

```jsonc
// Errado: responde 200 e grava externalId 0
{ "externalId": "abc-1", "code": "PROMO20", "amount": 20, "usageLimit": 500 }
// Errado: acima de 2147483647 grava 2147483647 e a busca pelo seu número dá 404
{ "externalId": 3000000000, "code": "PROMO20", "amount": 20, "usageLimit": 500 }
// Certo
{ "externalId": 90213, "code": "PROMO20", "type": "fixed_cart", "amount": 20,
  "minPurchaseValue": 100, "usageLimit": 500, "expiryDate": "2026-12-31T23:59:59-03:00" }
```

Se o seu ID de cupom não é inteiro, guarde o `id` da Zoppy e busque por `code` ou `id`.

**4. `minPurchaseValue` ausente em `fixed_cart` vira o próprio desconto.** Um cupom de R$ 20 sem
`minPurchaseValue` exige compra mínima de R$ 20. Mande `0` se não há mínimo.

**5. Data inválida não dá erro.** `expiryDate: "amanha"` responde 200 com `expiryDate: null` e
`isValid: false`. Data sem fuso (`"2026-12-31 23:59"`) é lida no horário de Brasília (-03:00).
Mande ISO 8601 com fuso.

**6. `externalId` acima de 255 caracteres é cortado sem aviso** no individual, e a busca pelo
valor inteiro não acha o cupom.

**7. `PUT` não valida.** `PUT /coupons/...` aceita qualquer `type` (até `"xyz"`) e grava. Valide
você mesmo antes. Campos que o `PUT` atualiza: `amount`, `code`, `expiryDate`, `externalId`,
`minPurchaseValue`, `phone`, `type`, `used`, `awaitingOrder`. Campo ausente mantém o valor atual.
`PUT` em cupom inexistente dá 422 `Coupon not found`.

**8. A exclusão termina em segundo plano.** `DELETE` responde 200 com a lista dos cupons que
serão excluídos e o cupom some das buscas em segundos ou alguns minutos. Detalhes:
- `DELETE /coupons/phone/{phone}` exclui todos os cupons individuais não usados e não vencidos do
  telefone, inclusive os que a Zoppy gerou (giftback).
- `DELETE /coupons/externalId/{externalId}` só acha cupom individual não usado e não vencido;
  usado dá 404 `Coupon not found`, e externalId inexistente dá 422 `O cupon informado não existe`.
- `GET /coupons/phone/{phone}?includeAllTypes=true` inclui cupons já excluídos na busca.

## Cupom usado em pedido (`couponCode`)

O resgate é informado no pedido, no campo `couponCode` (skill zoppy-partners-pedidos).

- O código precisa ser de um cupom individual cadastrado para o pedido devolver `couponUsed`
  preenchido e para o cupom virar `used: true`, o que acontece mesmo com o pedido em `on-hold`.
- `POST /orders` aceita `couponCode` que não existe (200, `couponUsed: null`). Já
  `PUT /orders/{id}` recusa com 422 `Coupon code not found`, inclusive para código de cupom
  compartilhado.
- A Zoppy registra o resgate informado no pedido. Mínimo de compra e validade são aplicados no seu
  checkout: confira os dois antes de aceitar o código.
- Depois de usado, o cupom continua aparecendo em `GET /coupons/code/{code}` com `used: true` e
  `isValid: false`, e sai das buscas por telefone. Isso não impede que ele seja aplicado de novo
  a um pedido sem código (regra 1).

## Webhook `coupon_create` (fluxo A)

Cadastro, um por conta:

- `POST /webhooks` com `event` (único valor aceito: `coupon_create`), `url` e, opcional,
  `bearerToken`. Evento diferente ou ausente dá 422 `Tipo de evento inválido`; sem `url`, 422
  `URL obrigatória`; `url` que não é texto dá 400 `["url must be a string"]`. Use uma URL https
  pública que responda rápido, com até 255 caracteres: acima disso ela é cortada sem aviso (a
  resposta do `POST` mostra a URL inteira, `GET /webhooks` mostra a cortada).
- Um segundo `POST /webhooks` para o mesmo evento não cria outro cadastro: substitui `url` e
  `bearerToken` do existente (mesmo `id`). Sem `bearerToken`, o token salvo é apagado.
- `PUT /webhooks/{id}` exige `event` e `url` de novo; `id` inexistente dá 404
  `Configuração de webhook não encontrada`, assim como `DELETE`.
- Guarde o `bearerToken` do seu lado. Cadastrar a URL não dispara chamada nenhuma.

O que a Zoppy envia quando gera um cupom, por exemplo por um fluxo de automação:

```http
POST <sua url>
Content-Type: application/json
Authorization: Bearer <bearerToken>     (só se você cadastrou bearerToken)

{ "code": "GBK7Q2XH", "id": "<id do cupom na Zoppy>", "orderId": "<id do pedido na Zoppy ou ausente>", "companyId": "<id da conta>" }
```

- O corpo é só um aviso: busque os dados em `GET /coupons/code/{code}` ou
  `GET /coupons/order/{orderId}`. `id` é o mesmo aceito em `GET /coupons/{id}`.
- Qualquer resposta fora de 2xx, ou falha de conexão, conta como falha e a Zoppy tenta de novo,
  em intervalos crescentes a partir de cerca de 2 segundos, até 10 tentativas. Responda 2xx logo
  e processe depois; use `code` como chave para não criar o mesmo cupom duas vezes.
- O cupom gerado pelo fluxo já aparece na Partners API segundos depois do pedido (2 s no teste),
  em `GET /coupons/order/{orderId}`, `/code/{code}`, `/{id}` e nas buscas por telefone. Tipo,
  valor, mínimo, validade e `acumulative` vêm da etapa do fluxo: num giftback de 15% com validade
  de 45 dias, um pedido `completed` de 200 gerou `type: fixed_cart`, `amount: 30`,
  `minPurchaseValue: 120`, `expiryDate` 45 dias depois às 23:59:59 UTC e `acumulative: false`;
  num cupom de 10% com validade de 30 dias disparado por pedido `on-hold`, cada pedido gerou um
  cupom novo com `type: percent`, `amount: 10` e `minPurchaseValue: 0`.
- No cupom gerado pela Zoppy, `externalId` vem `null` e `used` vem `null` (trate como não usado),
  e `acumulative` vem da etapa do fluxo, podendo ser `false`. Respeite esse valor ao criar o
  cupom do seu lado.
- O cupom gerado pelo fluxo não fica aguardando pedido: um pedido seguinte do mesmo telefone sem
  `couponCode` não recebe o cupom. Com `couponCode`, o pedido devolve `couponUsed`, o cupom vira
  `used: true` e não é aplicado de novo depois.
- Depois de criar do seu lado, devolva o seu ID com `PUT /coupons/code/{code}` e
  `{"externalId": "..."}`; a partir daí `GET /coupons/external/{externalId}` encontra o cupom.

Mais detalhes em [references/webhook.md](references/webhook.md).

## Configuração de cupom (`GET /coupons-config`)

Devolve os parâmetros de giftback da conta (`percentValue`, `maxPercentValue`,
`expirationDays`, `acumulative`, `enableGiftback` e as chaves dos outros fluxos). É só leitura e
é referência: quem decide se o cupom sai, e com que valor e se acumula, é a etapa do fluxo de
automação. Em uma conta com `enableGiftback: false` e `acumulative: true`, o fluxo gerou giftback
com `acumulative: false`.

## Referências e exemplos

Use os exemplos como modelo de código: leia o arquivo e adapte ao projeto. Só execute um exemplo se
o usuário pedir, com as três variáveis de ambiente de uma conta de teste e a partir da pasta desta
skill (os caminhos abaixo são relativos a ela). Os que gravam dados usam o prefixo `skills-test-` e
apagam o que criaram.

- [references/cupons.md](references/cupons.md): campos de resposta, erros e casos de borda dos cupons.
- [references/webhook.md](references/webhook.md): cadastro, corpo, reenvio e roteiro de recebimento.
- `assets/examples/01-cupom-individual.mjs` e `.curl.sh`: cliente pré-requisito, cadastrar, buscar e excluir.
- `assets/examples/02-cupom-compartilhado.mjs` e `.curl.sh`: cadastrar com limite de uso, buscar e excluir.
- `assets/examples/03-webhooks-e-config.mjs` e `.curl.sh`: listar webhooks e ler a configuração (só leitura).
- `assets/schemas/`: `cupom.create`, `cupom-compartilhado.create`, `webhook.create`.
