---
name: zoppy-partners-clientes
description: "Cria, atualiza, busca e exclui clientes na Partners API da Zoppy (/customers) sem duplicar cadastro nem perder dado. Use ao gerar código que envia clientes para a Zoppy, sincroniza a base de clientes de uma loja, ERP ou PDV, monta o payload de cliente (telefone, endereço, data de nascimento, gênero, e-mail), faz upsert por externalId ou busca cliente por telefone, e ao investigar cliente duplicado, telefone recusado (Phone invalid) ou dado que não foi gravado. Gatilhos em inglês: create or update customer in Zoppy, sync customers to Zoppy Partners API, customer payload, phone normalization, find customer by externalId or phone, duplicate customer. Não use para autenticação, base URL, paginação genérica e formato de erro (veja a skill zoppy-partners-api), para pedidos e o vínculo cliente no pedido (zoppy-partners-pedidos), produtos (zoppy-partners-produtos), carrinho abandonado (zoppy-partners-carrinho-abandonado) ou cupons e webhooks (zoppy-partners-cupons-webhooks)."
---

# Clientes na Partners API da Zoppy

**Regras fixas desta skill** (valem em toda tarefa, mesmo curta):
1. Rode `scripts/validate.mjs` (`cliente.create` ou `cliente.update`) em todo corpo antes de enviar, e leia cada `ERRO` e `AVISO`.
2. Em teste, `externalId`, nome e e-mail levam o prefixo do usuário inteiro, sem abreviar, e o telefone sai só da faixa que ele deu.
3. Nunca invente dado que o usuário não deu (e-mail, data de nascimento, gênero): pergunte, ou deixe o campo de fora e avise.
4. Releia com `GET /customers/{id}` o que gravou. Para dizer que não duplica, rode o cadastro 2 vezes antes da limpeza e compare o `id`.

## Antes de gerar código

1. Leia a skill `zoppy-partners-api` para autenticação (`Authorization: Bearer` + `zoppy-access`) e base URL. Credenciais: leia `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` só dentro do código. Nunca imprima, ecoe ou liste o ambiente (`env`, `printenv`, `echo $ZOPPY_...`) nem cole os valores em arquivo, log ou resposta; para conferir se existem, teste só a presença (`process.env[k] ? 'definida' : 'AUSENTE'`), sem mostrar o valor.
2. Todo corpo de `POST` e `PUT` de cliente passa pelo validador antes de ser enviado ou de entrar no código que você devolve, mesmo o mais simples:

```bash
node scripts/validate.mjs --schema=cliente.create '<json>'   # POST /customers
node scripts/validate.mjs --schema=cliente.update '<json>'   # PUT /customers/{id}
```

Execute o validador, sem precisar ler o código dele (Node 18 ou mais novo, sem dependências). `scripts/validate.mjs` fica na pasta desta skill (a pasta deste SKILL.md), não no projeto em que você trabalha: rode o comando de dentro dela ou troque `scripts/` pelo caminho completo (no Claude Code, `${CLAUDE_SKILL_DIR}/scripts/validate.mjs`). Saída `0` sem `ERRO` (pode ter `AVISO`), `1` com `ERRO`, `2` uso incorreto. `--file=<caminho>` lê o payload de um arquivo, `--json` devolve o resultado para máquina e `--help` mostra o uso. `AVISO` aponta algo que a API aceita com 200 mas grava diferente do que você espera.

3. Para sincronizar uma base, use o fluxo de upsert desta skill (seção "Sem duplicar"). Um `POST` cego por cliente não atualiza ninguém.
4. Dado criado em teste ou só para ver a resposta leva o prefixo definido pelo usuário e é apagado no fim (regra em `zoppy-partners-api`).

## Endpoints

| Método e rota | O que faz | Sucesso | Não encontrado |
|---|---|---|---|
| `GET /customers?after=YYYY-MM-DD&page=1&pageSize=50` | Lista clientes criados a partir de `after`; `updatedAt` opcional filtra por atualização | 200 `{pagination, data}` | |
| `GET /customers/{id}` | Busca pelo id da Zoppy | 200 | 422 `Customer not found` |
| `GET /customers/external/{externalId}` | Busca pelo seu id; também aceita o id da Zoppy | 200 | 422 `Customer not found` |
| `GET /customers/phone/{phone}` | Busca pelo telefone, em qualquer formato aceito | 200 | 422 `Customer not found` |
| `POST /customers` | Cria (ou devolve o existente com o mesmo telefone) | 200 | |
| `PUT /customers/{id}` | Atualiza pelo id da Zoppy | 200 | 404 `Customer not found` |
| `DELETE /customers/{id}` | Exclui | 200 `{"result":true}` | 404 `Customer not found` |

O `POST` responde 200, não 201. A busca por id, externalId ou telefone responde 422 (não 404) quando não acha. Na listagem, `after` é obrigatório (`422 Invalid after date`), `page` começa em 1 e `pageSize` vai até 50.

## Campos do POST e do PUT

| Campo | Tipo | Obrigatório | O que a API faz |
|---|---|---|---|
| `phone` | string | sim | Normaliza para DDD + número, sem 55. É a chave de deduplicação do `POST`. Número JSON responde 400 |
| `firstName` | string | sim | Grava com a inicial de cada palavra em maiúscula e o resto em minúscula |
| `lastName` | string | sim | Igual ao `firstName` |
| `address` | objeto | sim | Também no `PUT`. Sem ele, o `POST` responde 422 `Address is required` |
| `externalId` | string | não | Seu id. Não evita duplicata no `POST`. Sem ele, a resposta traz o id da Zoppy em `externalId` |
| `email` | string | não | Gravado como veio: sem validar formato, sem `trim`, sem minúsculas |
| `birthDate` | string | não | `YYYY-MM-DD` ou ISO 8601. Texto que não vira data responde 400 |
| `gender` | string | não | Gravado em maiúsculas. Envie `m` ou `f` |
| `customFields` | array | não | Campos personalizados, fora do escopo desta skill |

Campos do `address`: `address1` (rua e número), `address2` (complemento), `city`, `state` (UF), `postcode` (CEP, com ou sem hífen), `country`, `latitude`, `longitude`. A API não valida nenhum deles: no `POST` aceita `address: {}` e grava o endereço vazio; nos campos de texto converte tipo errado em texto (`true` vira `"1"`); `latitude` ou `longitude` que não são número viram `0`. Mande sempre `address1`, `city`, `state` e `postcode` como texto. Na resposta o `postcode` volta só com dígitos.

Não existe campo de CPF, de opt-in nem de consentimento de mensagem. Campos desconhecidos (`cpf`, `optIn` etc.) são ignorados sem erro e não voltam na resposta.

`position` aparece na resposta e é somente leitura (`null` em cliente novo). A resposta pode trazer `coupon` com um cupom ainda não usado ligado ao telefone do cliente (veja a skill `zoppy-partners-cupons-webhooks`).

## Telefone

A API tira tudo que não é dígito, remove um `0` inicial e aceita `55` e `0` antes do DDD. Depois exige DDD (2 dígitos) + 8 ou 9 dígitos.

| Enviado | Gravado e devolvido |
|---|---|
| `11900001001`, `5511900001001`, `+55 (11) 90000-1001`, `011900001001` | `11900001001` |
| `1100001006` (celular com 8 dígitos) | `11900001006` (a API acrescenta o 9) |
| `(11) 2000-0001` (fixo, começa com 2 a 5) | `1120000001` (fica com 10 dígitos) |
| `123`, `119000010`, `119000010101`, `""` | 422 `Phone invalid` |
| `11900001015` como número JSON | 400 `phone must be a string` |
| `55119000806` (55 + DDD + 7 dígitos, falta um) | `55119000806` (lido como DDD 55) |

Só existe telefone brasileiro. Número estrangeiro que caiba no formato é aceito e lido como DDD brasileiro: `+1 415 555 0100` vira `14155550100` e `001 415 000 8005` vira `14150008005`. O validador avisa quando o número começa com `+` ou `00` sem `55`, e quando 11 dígitos começando com `55` seriam lidos como DDD 55.

## Sem duplicar: o que o POST faz com dado repetido

| Situação no POST | Resultado |
|---|---|
| Telefone já cadastrado (em qualquer formato) | 200 com o cliente **existente**: mesmo id, sem alterar nome, e-mail, endereço nem `externalId` |
| Mesmo `externalId`, telefone diferente | Cria **outro** cliente. Depois disso, `GET /customers/external/{externalId}` devolve só um deles, sem garantia de qual |
| Mesmo e-mail, telefone diferente | Cria outro cliente |
| Telefone de um cliente já excluído | Cria cliente novo, com id novo. Confira o `address` da resposta: ele pode vir com o endereço do cadastro excluído, e nesse caso o `address` enviado foi ignorado |

Por isso, para sincronizar, faça upsert:

1. `GET /customers/external/{externalId}`. Se responder 200, faça `PUT /customers/{id}` com o payload.
2. Se responder 422, faça `POST /customers`.
3. Se o `externalId` **ou o endereço** da resposta do `POST` forem diferentes do que você mandou, o telefone já era de outro cadastro e o que você mandou não foi gravado. Faça `PUT /customers/{id}` nesse id com o seu payload: ele atualiza os dados e grava o seu `externalId`.

O `PUT` do passo 3 substitui o `externalId` do outro cadastro: o `externalId` antigo deixa de ser encontrado (422). Ao entregar o código, avise o usuário disso: quem buscava aquele cadastro pelo `externalId` antigo (outra integração, outro registro seu) passa a receber 422. Se dois registros seus dividem o mesmo telefone (família, telefone da loja), cada sincronização passa o vínculo de um para o outro; trate esses casos antes de enviar.

Código completo: `assets/examples/03-upsert-por-externalid.mjs`.

## Atualizar (PUT)

O `PUT /customers/{id}` usa o id da Zoppy (o `id` da resposta, não o seu `externalId`) e exige os mesmos campos obrigatórios do `POST`.

- Sempre substituídos: `firstName`, `lastName` e `phone` (são obrigatórios).
- Todos os outros campos, inclusive os do `address`, só mudam quando a chave vem no corpo; chave ausente mantém o valor atual. Com `address: {}` o endereço fica como estava, mas a resposta do `PUT` mostra esses campos ausentes ou vazios: confira com `GET`.
- `null` mantém o valor em `email`, `birthDate`, `gender`, `address2`, `country`, `latitude` e `longitude`, mas apaga `address1`, `city`, `state` e `postcode`.
- Texto vazio apaga: `email: ""`, `gender: ""`, `address2: ""`. `externalId: ""` desfaz o vínculo com o seu id (a resposta passa a trazer o id da Zoppy em `externalId`).
- `birthDate` não pode ser apagado: `null` mantém e `""` responde 400.
- `latitude` e `longitude` só são gravadas no `PUT`; no `POST` são ignoradas.
- Trocar o telefone é aceito. Em segundo plano, a Zoppy passa para o número novo o histórico ligado ao número antigo (os pedidos passam a ter o telefone novo). A API não impede usar um telefone que já pertence a outro cliente: os dois ficam com o mesmo número, e a busca por telefone e o `POST` passam a devolver um dos dois, sem garantia de qual.
- A resposta do `PUT` pode trazer o `updatedAt` anterior. Para conferir, leia de volta com `GET /customers/{id}`.

## Datas e gênero

`birthDate` volta em UTC. `"1990-05-15"` e `"1990-05-15T00:00:00.000Z"` gravam `1990-05-15T00:00:00.000Z`. Com fuso, a API converte: `"1990-05-15T00:00:00-03:00"` vira `1990-05-15T03:00:00.000Z`. Com hora e sem fuso, a hora é lida no horário de Brasília: `"1990-05-15 10:00"` vira `1990-05-15T13:00:00.000Z`. `"15/05/1990"` e `""` respondem 400 `birthDate must be a Date instance`. Data impossível passa e rola para o mês seguinte: `"1990-02-30"` grava `1990-03-02T00:00:00.000Z`. Prefira `YYYY-MM-DD` e confira a data antes de enviar.

`gender` aceita qualquer texto e grava em maiúsculas: `"f"` vira `"F"`, `"masculino"` vira `"MASCULINO"`. No `POST`, `""` grava sem gênero (`null`). Número responde 400.

## Cliente e pedido

- O pedido recebe o cliente em `customerId`, que precisa ser o id da Zoppy. O seu `externalId` ali responde 422 `Customer not found`. Crie o cliente antes e guarde o `id`.
- O pedido não guarda cópia do endereço: ele aponta para o endereço do cliente. Atualizar o endereço do cliente muda o endereço que aparece nos pedidos dele.
- Excluir o cliente não exclui os pedidos; o pedido continua existindo com `customer: null`.

Detalhes de pedido: skill `zoppy-partners-pedidos`.

## Erros comuns

| Status | Corpo (trecho) | Causa |
|---|---|---|
| 400 | `{"message":["phone must be a string"],"error":"Bad Request"}` | `phone`, `firstName` ou `lastName` ausente ou não texto; vale também para `externalId` e `gender` não texto |
| 400 | `{"message":["birthDate must be a Date instance"]}` | data em formato que não vira data |
| 422 | `{"message":"Phone invalid","error":"Unprocessable Entity","statusCode":422}` | telefone que não vira DDD + 8 ou 9 dígitos |
| 422 | `{"message":"Address is required"}` | `POST` sem `address` (com telefone inválido também: `"Phone invalid, Address is required"`) |
| 422 | `{"message":"Customer not found"}` | busca sem resultado |
| 404 | `{"message":"Customer not found","error":"Not Found"}` | `PUT` ou `DELETE` com id que não existe (inclui excluir duas vezes) |
| 500 | `{"statusCode":500,"message":"Internal server error"}` | `PUT` sem `address` |

No 400 `message` é uma lista; nos demais é texto.

## Exemplos e referências

Use os exemplos como modelo de código: leia o arquivo e adapte ao projeto. Só execute um exemplo se
o usuário pedir, com as três variáveis de ambiente de uma conta de teste e a partir da pasta desta
skill (os caminhos abaixo são relativos a ela). Os que gravam dados usam o prefixo `skills-test-` e
apagam o que criaram.

- `assets/examples/01-ciclo-cliente.mjs`: criar, buscar por externalId, atualizar, conferir e excluir.
- `assets/examples/02-ciclo-cliente.curl.sh`: o mesmo ciclo em curl.
- `assets/examples/03-upsert-por-externalid.mjs`: upsert sem duplicar, incluindo telefone já cadastrado.
- `references/campos-e-respostas.md`: resposta completa, o que é gravado campo a campo, listagem.
- `references/casos-de-borda.md`: cada caso de borda com o pedido e a resposta reais.
