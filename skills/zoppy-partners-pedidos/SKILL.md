---
name: zoppy-partners-pedidos
description: "Envia pedidos para a Partners API da Zoppy (/orders) com o total e as datas que a Zoppy espera. Use ao gerar código que cria, reenvia (PUT), busca, lista ou exclui pedidos; ao montar subtotal, discount e shipping (não existe campo total); ao escolher o status (completed, on-hold, canceled, processing); ao decidir createdAt e completedAt; ao ligar itens e cupom usado ao pedido; e ao investigar total negativo, frete descontado duas vezes, pedido fora do período da venda ou itens que sumiram. Gatilhos em inglês: send orders to Zoppy, create or update order, order total, subtotal with shipping, order status, order createdAt, order line items. Não use para autenticação e paginação (veja a skill zoppy-partners-api), cliente (zoppy-partners-clientes), produto (zoppy-partners-produtos), carrinho abandonado (zoppy-partners-carrinho-abandonado), cupons e webhooks (zoppy-partners-cupons-webhooks), loja do pedido (zoppy-partners-lojas) ou vendedor do pedido (zoppy-partners-vendedores)."
---

# Pedidos na Partners API da Zoppy

## Antes de gerar código

1. Leia a skill `zoppy-partners-api` para autenticação (`Authorization: Bearer` + `zoppy-access`), base URL e paginação. Credenciais: leia `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` só dentro do código. Nunca imprima, ecoe ou liste o ambiente (`env`, `printenv`, `echo $ZOPPY_...`) nem cole os valores em arquivo, log ou resposta; para conferir se existem, teste só a presença (`process.env[k] ? 'definida' : 'AUSENTE'`), sem mostrar o valor.
2. O cliente precisa existir antes (veja a skill `zoppy-partners-clientes`) e os produtos também, se o pedido tiver itens (skill `zoppy-partners-produtos`). O pedido usa os **ids da Zoppy** devolvidos por esses cadastros, não os seus `externalId`.
3. Dado criado em teste ou só para ver a resposta leva o prefixo definido pelo usuário e é apagado no fim (regra em `zoppy-partners-api`), inclusive os cupons que as automações da conta geram a partir do pedido (seção "Automações da conta").
4. Todo corpo de `POST` e `PUT` de pedido passa pelo validador antes de ser enviado ou de entrar no código que você devolve:

```bash
node scripts/validate.mjs --schema=pedido.create '<json>'   # POST /orders
node scripts/validate.mjs --schema=pedido.update '<json>'   # PUT /orders/{id}
```

Execute o validador, sem precisar ler o código dele (Node 18 ou mais novo, sem dependências). `scripts/validate.mjs` fica na pasta desta skill (a pasta deste SKILL.md), não no projeto em que você trabalha: rode o comando de dentro dela ou troque `scripts/` pelo caminho completo (no Claude Code, `${CLAUDE_SKILL_DIR}/scripts/validate.mjs`). Saída `0` sem `ERRO` (pode ter `AVISO`), `1` com `ERRO`, `2` uso incorreto. `--file=<caminho>` lê o payload de um arquivo, `--json` devolve o resultado para máquina e `--help` mostra o uso. `ERRO` é payload que a API recusa ou grava com valor errado. `AVISO` é algo que a API aceita com 200 mas grava diferente do que você provavelmente espera: leia cada um.

## Endpoints

| Método e rota | O que faz | Sucesso | Não encontrado |
|---|---|---|---|
| `GET /orders?after=...&page=1&pageSize=50` | Lista pedidos com `createdAt` a partir de `after`; `updatedAt` opcional filtra por atualização | 200 `{data, pagination}` | |
| `GET /orders/{id}` | Busca pelo id da Zoppy | 200 | 404 `Order not found` |
| `GET /orders/external/{externalId}` | Busca pelo seu id | 200 | 404 `Order not found` |
| `POST /orders` | Cria | 200 | |
| `PUT /orders/{id}` | Reenvia o pedido (substitui valores, status, datas e itens) | 200 | 404 `Pedido não encontrado` |
| `DELETE /orders/{id}` | Exclui | 200 `{"result":true}` | 404 `Order not found` |

O `POST` responde 200, não 201. Depois de excluído, o pedido some das buscas e o mesmo `externalId` pode ser usado de novo.

## Valores: não existe campo `total`

A Zoppy **não recebe `total`** (se vier, é ignorado). Ela grava:

```
total = subtotal - discount - shipping
```

O `total` gravado é o valor dos produtos com desconto, **sem frete**. Por isso:

- **`subtotal` = itens + frete, antes do desconto.** Se o `subtotal` vier só com os itens, o frete é descontado do total.
- **`discount`** = desconto sobre os produtos.
- **`shipping`** = frete cobrado do cliente. **Frete grátis ou zerado por cupom é `shipping: 0`**, e o frete não entra no `subtotal` nem no `discount`.
- **Envie sempre `discount` e `shipping`, mesmo que 0.** Sem um deles a API responde 200 mas grava `total` 0 (a resposta do `POST`/`PUT` traz `total` e `subtotal` `null`; o `GET` traz `total` 0).
- A API não recusa total negativo: `subtotal` menor que `discount + shipping` grava total negativo sem erro.

Na resposta, `total` é o valor gravado e `subtotal` é recalculado como `total + discount + shipping`.

| Exemplo | Payload certo | `total` gravado |
|---|---|---|
| Itens 131,60, frete 20, desconto 7,58 | `subtotal 151.60, discount 7.58, shipping 20` | 124,02 |
| Mesmo pedido com `subtotal` só dos itens (errado) | `subtotal 131.60, discount 7.58, shipping 20` | 104,02 |
| Itens 100, frete grátis, desconto 10 | `subtotal 100, discount 10, shipping 0` | 90 |
| Itens 50 com cupom de 100% e frete grátis | `subtotal 50, discount 50, shipping 0` | 0 |
| Mesmo pedido mandando o frete de 10 como cobrado (errado) | `subtotal 50, discount 60, shipping 10` | -20 |

Números vão como número JSON. `"151.60"` como texto responde 400. A resposta do `POST` e do `PUT` pode trazer o total com casas longas (`124.01999999999998`); o `GET` devolve `124.02`. Compare em centavos.

## Status

Aceita exatamente, em minúsculas: `completed` (pago ou confirmado), `on-hold` (aguardando pagamento), `canceled` (com um L) e `processing`. Qualquer outro valor, inclusive `cancelled`, `Completed`, `pending` ou status ausente, responde `422 Invalid status`.

- `processing` no `POST` é gravado como `on-hold`. No `PUT` fica `processing`. Use `on-hold`.
- `completedAt` só é gravado com status `completed`; com outro status ele vira `null`.
- `completed` sem `completedAt`: no `POST` o pedido fica sem `completedAt`; no `PUT` a API mantém o `completedAt` anterior.

## Datas: `createdAt` é a data da venda

`createdAt` é a data do pedido. É por ela que a listagem filtra (`after`). Se ela faltar, a Zoppy usa outra data:

| Operação | `createdAt` gravado |
|---|---|
| `POST` com `createdAt` | o `createdAt` enviado |
| `POST` sem `createdAt`, com `completedAt` | o `completedAt` (mesmo com status diferente de `completed`) |
| `POST` sem os dois | o momento em que a Zoppy recebeu |
| `PUT` com `createdAt` | o `createdAt` enviado |
| `PUT` sem `createdAt`, com `completedAt` | **troca a data do pedido pela do `completedAt`** |
| `PUT` sem os dois | mantém a data atual |

Venda em 05/09 confirmada em 09/09 sem `createdAt` fica datada de 09/09 e não aparece no período da venda. **Envie sempre `createdAt`, inclusive no `PUT`.** O validador dá `ERRO` quando falta `createdAt` e vem `completedAt`.

Formato: ISO 8601 com fuso, ex. `2026-09-05T10:26:00-03:00`. O que a API faz com outros formatos:

| Enviado | Gravado (UTC) |
|---|---|
| `2026-09-05T10:26:00-03:00` | `2026-09-05T13:26:00.000Z` |
| `2026-09-05 10:26` ou `2026-09-05T10:26:00` (sem fuso) | `2026-09-05T13:26:00.000Z` (lido no horário de Brasília) |
| `2026-09-05` (só a data) | `2026-09-05T00:00:00.000Z`, que é 04/09 às 21h em Brasília |
| `05/09/2026` | `2026-05-09T03:00:00.000Z` (lido como mês/dia: 9 de maio) |
| `ontem` | 400 `createdAt must be a Date instance` |

O validador recusa data sem fuso de propósito, para não depender dessa interpretação.

## `PUT` é reenvio completo

O `PUT /orders/{id}` recalcula o total e substitui o pedido. Mande o pedido inteiro, como no `POST`, sem `externalId` e `customerId`, e com uma ressalva para o cupom: só envie `couponCode` se o cupom existir na Zoppy (veja abaixo).

- Recalcula `total` com o `subtotal`, `discount` e `shipping` enviados. Sem `discount` ou `shipping`, grava total 0.
- **`lineItems` ausente apaga todos os itens do pedido.** Reenvie os itens sempre.
- `externalId` e `customerId` no corpo são ignorados: não mudam depois de criados.
- Sem `couponCode`, `provider`, `storeId`/`store` ou vendedor, mantém o que já estava. O `PUT` não remove vendedor; `couponCode: ""` apaga o cupom do pedido.
- **`couponCode` que não existe na Zoppy responde `422 Coupon code not found` e nada é gravado**, mesmo que o `POST` do mesmo pedido tenha aceitado esse código (o `POST` aceita qualquer código). Cupom do seu sistema ou de outra plataforma: omita `couponCode` no `PUT`; ausente mantém o cupom gravado.

**Confira o `PUT` lendo de volta.** Um `PUT` enviado poucos segundos depois do `POST` do mesmo pedido às vezes é desfeito: o processamento do `POST` regrava a versão anterior e o `GET` volta com os valores do `POST`, mesmo com o `PUT` tendo respondido 200. Depois do `PUT`, espere alguns segundos, faça `GET /orders/{id}` e, se o pedido não refletir o `PUT`, reenvie.

Para sincronizar sem duplicar: `GET /orders/external/{externalId}`; 404 → `POST /orders`; 200 → `PUT /orders/{id}` com o `id` devolvido.

## Cliente, itens, cupom, vendedor e loja

- **`customerId`** (obrigatório no `POST`): id da Zoppy do cliente. O `externalId` do cliente ou um id inexistente responde `422 Customer not found`. O endereço e o telefone do pedido vêm do cadastro do cliente; não existe campo de endereço no pedido. Pedido de cliente excluído responde `422 Customer address not found` no `PUT`.
- **`lineItems`**: `[{ "productId": "<id da Zoppy>", "quantity": 2 }]`. `productId` inexistente ou com o `externalId` do produto é descartado sem erro. `quantity` é obrigatório, número, mínimo 0, e é gravado inteiro (1.5 vira 2). Não há preço por item: a resposta traz o preço do cadastro do produto. Itens em outro campo (`items`) são ignorados.
- **`couponCode`**: código do cupom usado. Se o cupom existir na conta, a resposta traz `couponUsed` e, segundos depois, o cupom passa a constar como usado. Com cupom existente e `discount: 0`, a Zoppy preenche o `discount` com o valor do cupom e o `subtotal` lido de volta aumenta: envie o desconto real.
- **Vendedor**: `userId` ou `seller`. Vendedor não encontrado não dá erro: o pedido fica sem vendedor. Como cadastrar e como o pedido acha o vendedor: skill `zoppy-partners-vendedores`.
- **Loja**: `storeId` ou `store`. `storeId` inexistente ou de loja inativa responde 422; pedido sem loja reconhecida vai, sem erro, para a loja padrão "Integrador Externo". Como escolher, reaproveitar lojas e corrigir pedidos na loja errada: skill `zoppy-partners-lojas`.
- **`provider`**: texto livre, gravado e devolvido como veio.
- **`createCoupon`** e **`orderFromZoppy`**: aceitos (booleanos), mas não alteram o pedido gravado nem criam cupom.

### Automações da conta

Todo `POST` e `PUT` aceito entra no processamento de pedidos da Zoppy segundos depois: registra o uso do cupom e roda as automações de pedido configuradas na conta. Pedido `completed`, e também pedido em outro status se a conta tiver fluxo para ele (um fluxo de pedido `on-hold`, por exemplo), pode disparar um fluxo que cria cupom ou giftback para o telefone do cliente. O cupom aparece segundos depois em `couponCreated` no `GET /orders/{id}` e em `GET /coupons/order/{id}`. O que dispara depende da configuração da conta.

- Ao testar, depois de cada pedido espere alguns segundos, liste esses cupons (`GET /coupons/order/{id}` ou `GET /coupons/phone/{telefone}/many`) e apague-os na limpeza (skill `zoppy-partners-cupons-webhooks`).
- Antes de enviar pedidos reais ou carga histórica, confira com o time da Zoppy quais fluxos estão ligados na conta: o cliente pode receber cupom gerado por esses fluxos.

## Idempotência

O mesmo `externalId` duas vezes no `POST` responde `422 External id already exists` e não cria outro pedido. Sem `externalId`, cada `POST` cria um pedido novo. Envie sempre o `externalId`.

## Erros comuns

| Situação | Status e corpo |
|---|---|
| Campo com tipo errado ou ausente (`subtotal`, `customerId`, `lineItems[].quantity`) | 400 `{"message":["subtotal must be a number conforming to the specified constraints"],...}` (lista) |
| Regra de negócio | 422 `{"message":"Invalid status",...}` (texto; várias regras saem juntas, separadas por vírgula) |
| `externalId` repetido | 422 `External id already exists` |
| Cliente inexistente | 422 `Customer not found` |
| Loja inexistente ou inativa | 422 `Store not found for this company (storeId: ...)` ou `Store "<nome>" is inactive and cannot receive orders ...` |
| Pedido inexistente | 404 `Order not found` (GET, DELETE) ou `Pedido não encontrado` (PUT) |

Lista completa em `references/erros.md`.

## Mais detalhes

Use os exemplos como modelo de código: leia o arquivo e adapte ao projeto. Só execute um exemplo se
o usuário pedir, com as três variáveis de ambiente de uma conta de teste e a partir da pasta desta
skill (os caminhos abaixo são relativos a ela). Os que gravam dados usam o prefixo `skills-test-` e
apagam o que criaram.

- `references/campos.md`: todos os campos do request e da resposta.
- `references/erros.md`: erros com corpo real e casos de borda.
- `assets/examples/01-criar-pedido.mjs` e `.curl.sh`: cria cliente e produto, cria pedido com frete e desconto, confere `total`, `subtotal`, datas e externalId repetido, e apaga tudo.
- `assets/examples/02-reenviar-pedido-put.mjs` e `.curl.sh`: reenvio por `PUT` conferindo total recalculado, `createdAt` mantido e itens.
- `assets/examples/*.fixture.json`: payloads do caso de frete descontado duas vezes, errado e certo, para rodar no validador.
