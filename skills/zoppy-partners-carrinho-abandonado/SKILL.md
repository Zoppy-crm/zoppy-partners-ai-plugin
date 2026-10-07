---
name: zoppy-partners-carrinho-abandonado
description: "Envia, atualiza, busca, lista e exclui carrinhos abandonados na Partners API da Zoppy (/abandoned-carts) com os valores e datas que a Zoppy espera, e explica o que faz a recuperação do carrinho começar ou ser barrada por um pedido. Use ao gerar código que manda carrinho abandonado para a Zoppy, ao montar subtotal, discount, shipping, url e lineItems do carrinho, ao depurar total 0, total negativo, item sumido, erro 422 ou 500 em /abandoned-carts, ou ao entender por que um carrinho não entrou na recuperação. Gatilhos: carrinho abandonado, enviar carrinho para a Zoppy, recuperação de carrinho, checkout abandonado, abandoned cart, send abandoned cart to Zoppy, cart recovery, POST /abandoned-carts, abandoned cart total is 0. Não use para autenticação, base URL e paginação em geral (use zoppy-partners-api), cadastro de cliente (zoppy-partners-clientes), cadastro de produto (zoppy-partners-produtos), pedidos (zoppy-partners-pedidos) nem cupons e webhooks (zoppy-partners-cupons-webhooks)."
---

# Carrinho abandonado na Partners API da Zoppy

Recurso `/abandoned-carts`. Um carrinho pertence a um cliente já cadastrado e leva o link de
recuperação (`url`) que a Zoppy usa nos fluxos de carrinho abandonado da conta.

## Antes de gerar código

1. Leia a skill `zoppy-partners-api` para autenticação (`Authorization: Bearer` e `zoppy-access`),
   base URL e formato de erro. Leia as variáveis `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e
   `ZOPPY_PARTNERS_BASE_URL` do ambiente; nunca escreva token no código.
2. Crie antes o cliente (skill `zoppy-partners-clientes`) e os produtos (skill
   `zoppy-partners-produtos`). O carrinho usa os **ids da Zoppy** devolvidos por eles, não o seu
   `externalId`.
3. Valide cada corpo antes de enviar:

```bash
node scripts/validate.mjs --schema=carrinho.create '<json>'   # POST
node scripts/validate.mjs --schema=carrinho.update '<json>'   # PUT
```

Execute o validador, sem precisar ler o código dele (Node 18 ou mais novo, sem dependências). `scripts/validate.mjs` fica na pasta desta skill (a pasta deste SKILL.md), não no projeto em que você trabalha: rode o comando de dentro dela ou troque `scripts/` pelo caminho completo (no Claude Code, `${CLAUDE_SKILL_DIR}/scripts/validate.mjs`). Saída `0` sem `ERRO` (pode ter `AVISO`), `1` com `ERRO`, `2` uso incorreto. `--file=<caminho>` lê o payload de um arquivo, `--json` devolve o resultado para máquina e `--help` mostra o uso.

## Endpoints

| Operação | Método e rota | Sucesso |
|---|---|---|
| Criar | `POST /abandoned-carts` | 200 com o carrinho |
| Buscar por id | `GET /abandoned-carts/:id` | 200; 404 se não existe |
| Buscar pelo seu id | `GET /abandoned-carts/external/:externalId` | 200; 404 se não existe |
| Listar | `GET /abandoned-carts?after=&page=&pageSize=[&updatedAt=]` | 200 com `data` e `pagination` |
| Atualizar | `PUT /abandoned-carts/:id` | 200 com o carrinho |
| Excluir | `DELETE /abandoned-carts/:id` | 200 `{"result":true}`; 404 se não existe |

O `POST` responde 200, não 201.

## Campos do POST

| Campo | Tipo | Obrigatório | O que acontece |
|---|---|---|---|
| `customerId` | string | sim | Id da Zoppy do cliente. Ausente: 400. Inexistente na conta (ou o `externalId` do cliente): 422 `Customer not found` |
| `subtotal` | number | sim | Valor bruto do carrinho, **frete incluído**. String como `"199.90"`: 400 |
| `discount` | number | na prática sim | Mande `0` se não houver. Ausente: aceito, mas o total gravado vira `0` |
| `shipping` | number | na prática sim | Mande `0` se não houver. Ausente: aceito, mas o total gravado vira `0` |
| `url` | string | sim | Link de recuperação. Ausente ou `""`: 422 `Abandoned Cart URL is required.`. Espaços nas pontas são removidos |
| `externalId` | string | não | Seu id do carrinho. Repetido: 422 `External id already exists` |
| `lineItems` | lista | não | `[{ "productId": "<id da Zoppy>", "quantity": 2 }]`. Precisa ser lista |
| `createdAt` | data ISO 8601 com fuso | não | Data do abandono. Ausente: vira o momento do recebimento |
| `updatedAt` | data | não | Ignorado: a API grava o momento do recebimento |

Detalhe de cada campo, da resposta e da listagem em [references/campos.md](references/campos.md).

## O total gravado

A Zoppy grava **`total = subtotal - discount - shipping`**. Por isso o `subtotal` precisa ser o
valor bruto com o frete dentro.

```json
// Produtos 100, frete 20, desconto 10
// ERRADO: subtotal sem frete, total gravado 70
{ "subtotal": 100, "discount": 10, "shipping": 20 }
// CERTO: total gravado 90 (produtos com desconto, sem frete)
{ "subtotal": 120, "discount": 10, "shipping": 20 }
```

- `subtotal` menor que `discount + shipping` é aceito e grava total negativo. O validador acusa.
- `discount` negativo é aceito e grava total maior que o `subtotal`. O validador avisa.
- Sem `discount` ou sem `shipping` a API responde 200 e grava total `0`. Sempre mande os dois.
  Nesse caso a resposta do `POST`/`PUT` traz `total` e `subtotal` `null` (só o `GET` mostra o
  `0`), e no `PUT` sem `discount` o desconto anterior continua gravado.

Na leitura (resposta do `POST`, `PUT` e `GET`, com `discount` e `shipping` enviados), os valores
não voltam como foram enviados:

| Campo lido | Valor |
|---|---|
| `total` | o total gravado |
| `discount` | o desconto enviado |
| `subtotal` | `total + discount` (não o `subtotal` enviado) |
| `shipping` | sempre `0` (o frete não é guardado separado) |

Para conferir um envio, compare `total` e `discount`, não `subtotal` e `shipping`.

## Regras que mais causam erro

1. **`lineItems.productId` é o id da Zoppy do produto.** Item com `productId` inexistente ou com o
   `externalId` do produto é descartado sem erro: o carrinho volta com menos itens. Confira
   `lineItems.length` na resposta.
2. **`quantity` não é validada.** O `GET` mostra o que foi gravado: negativa fica negativa
   (`-3`), `"2"` vira `2`, `"abc"` vira `0`, decimal é arredondado (`1.5` vira `2`), ausente vira
   `null`. A resposta do `POST` repete o valor enviado; confira pelo `GET`.
3. **500 não quer dizer que nada foi gravado.** Com `lineItems` que não é lista (objeto, texto,
   número) ou com um item `null` ou sem `productId`, a API responde 500 depois de gravar:
   - no `POST`, o carrinho fica criado só com os itens anteriores ao inválido, e segue para a
     recuperação como qualquer outro. Reenviar com o mesmo `externalId` dá 422: busque pelo
     `externalId` e corrija com `PUT`;
   - no `PUT`, valores e `url` já foram trocados e os itens antigos apagados; ficam só os itens
     anteriores ao inválido. Refaça o `PUT` com a lista certa.
   `lineItems` `null` ou `""` é aceito como carrinho sem itens; item com `productId` `null` é
   descartado sem erro.
4. **`PUT` exige a chave `url`.** Sem ela o `PUT` responde 500 e nada muda. Com `url` `""` ou só
   espaços o `PUT` responde 200 e apaga o link de recuperação.
5. **`PUT` substitui os itens.** Os itens atuais são apagados e trocados pela lista enviada; sem
   `lineItems` o carrinho fica sem itens. Mande sempre a lista completa.
6. **`PUT` não muda `externalId`, `customerId` nem `createdAt`.** Esses campos são ignorados no
   `PUT` sem erro, desde que válidos; `createdAt` ou `updatedAt` inválido dá 400 como no `POST`.
   Para trocar o cliente, exclua e crie de novo.
7. **Mande datas em ISO 8601 com fuso**: `2026-09-05T10:26:00-03:00`. Data e hora sem fuso
   (`"2026-09-05 10:26"`) é lida como horário de Brasília (vira `2026-09-05T13:26:00.000Z`); só a
   data (`"2026-09-05"`) vira meia-noite UTC (`2026-09-05T00:00:00.000Z`, 21h do dia anterior em
   Brasília). Data inválida (`"ontem"`): 400. O validador da skill exige o formato com fuso.
8. **Campos desconhecidos** são aceitos e ignorados, sem erro. Um erro de digitação
   (`lineitems`) passa em silêncio; o validador avisa.

## Idempotência

- `externalId` é único entre os carrinhos não excluídos da conta. Mandar o mesmo `externalId` de
  novo responde 422 `External id already exists` e não cria outro carrinho.
- Para reenviar um carrinho que já existe: `GET /abandoned-carts/external/:externalId`, pegue o
  `id` e faça `PUT /abandoned-carts/:id`.
- Sem `externalId`, cada `POST` cria um carrinho novo.
- Depois de um `DELETE`, o mesmo `externalId` pode ser usado de novo.

## Recuperação e pedidos

- `POST` e `PUT` bem-sucedidos pedem que a Zoppy reavalie o carrinho para os fluxos de carrinho
  abandonado da conta, de forma assíncrona, **no máximo uma vez por carrinho a cada 60 s**: um
  `PUT` feito menos de 60 s depois do envio anterior do mesmo carrinho não gera nova avaliação.
  Se alguma mensagem sai depende dos fluxos configurados na conta; a resposta não informa isso.
- A Zoppy **não inicia** a recuperação de um carrinho quando já existe pedido, de qualquer status,
  com o mesmo telefone do cliente do carrinho e com `createdAt` (a data gravada do pedido, não a
  hora do envio) **depois** do `createdAt` do carrinho. O teste é feito a cada avaliação.
- Por isso o `createdAt` importa: mande a data real do abandono. Sem ele, a data é o momento do
  envio, e um pedido feito antes desse envio não barra a recuperação.
- O carrinho **não é marcado como convertido**: não há campo de status ou conversão na resposta,
  e ela não muda quando chega o pedido.

Detalhe e como foi observado em [references/recuperacao.md](references/recuperacao.md).

## Erros comuns

| Situação | Status | Corpo |
|---|---|---|
| `subtotal` ausente ou string | 400 | `{"message":["subtotal must be a number conforming to the specified constraints"],"error":"Bad Request","statusCode":400}` |
| `customerId` ausente | 400 | `"customerId must be a string"` na lista `message` |
| `createdAt` ou `updatedAt` inválido (POST e PUT) | 400 | `"createdAt must be a Date instance"` |
| `url` ausente ou vazia no POST | 422 | `{"message":"Abandoned Cart URL is required.","error":"Unprocessable Entity","statusCode":422}` |
| cliente não existe | 422 | `"Customer not found"` |
| `externalId` repetido | 422 | `"External id already exists"` |
| várias regras ao mesmo tempo | 422 | mensagens juntas com `, ` |
| id inexistente (GET, PUT, DELETE) | 404 | `{"message":"Abandoned Cart not found","error":"Not Found","statusCode":404}` |
| `PUT` sem `url` (nada muda); `lineItems` que não é lista, item `null` ou sem `productId` (já gravou, ver regra 3) | 500 | `{"statusCode":500,"message":"Internal server error"}` |

Lista completa e casos de borda em [references/erros.md](references/erros.md).

## Exemplos prontos

Use os exemplos como modelo de código: leia o arquivo e adapte ao projeto. Só execute um exemplo se
o usuário pedir, com as três variáveis de ambiente de uma conta de teste e a partir da pasta desta
skill (os caminhos abaixo são relativos a ela). Os que gravam dados usam o prefixo `skills-test-` e
apagam o que criaram.

- `assets/examples/01-criar-buscar-atualizar-excluir.mjs` e `.curl.sh`: cria cliente e produto,
  cria o carrinho, lê por id e por `externalId`, testa o `externalId` repetido, atualiza, confere,
  exclui e limpa tudo.
- `assets/examples/02-listar.mjs`: lista com `after`, `page` e `pageSize` e acha o carrinho criado.
