---
name: zoppy-partners-clientes
description: Cria, atualiza, busca e exclui clientes na Partners API da Zoppy (/customers) sem duplicar cadastro nem perder dado. Use ao gerar código que envia clientes para a Zoppy, sincroniza a base de clientes de uma loja, ERP ou PDV, monta o payload de cliente (telefone, endereço, data de nascimento, gênero, e-mail), faz upsert por externalId ou busca cliente por telefone, e ao investigar cliente duplicado, telefone recusado (Phone invalid) ou dado que não foi gravado. Triggers EN, create or update customer in Zoppy, sync customers to Zoppy Partners API, customer payload, phone normalization, find customer by externalId or phone, duplicate customer. Não use para autenticação, base URL, paginação genérica e formato de erro (veja a skill zoppy-partners-api), para pedidos e o vínculo cliente no pedido (zoppy-partners-pedidos), produtos (zoppy-partners-produtos), carrinho abandonado (zoppy-partners-carrinho-abandonado) ou cupons e webhooks (zoppy-partners-cupons-webhooks).
---

# Clientes na Partners API da Zoppy

## Antes de gerar código

1. Leia a skill `zoppy-partners-api` para autenticação (`Authorization: Bearer` + `zoppy-access`) e base URL. Nunca coloque token no código: leia de `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL`.
2. Valide cada payload antes de enviar:

```bash
node scripts/validate.mjs --schema=cliente.create '<json>'   # POST /customers
node scripts/validate.mjs --schema=cliente.update '<json>'   # PUT /customers/{id}
```

Exit `0` válido, `1` inválido, `2` erro de uso. `AVISO` aponta algo que a API aceita com 200 mas grava diferente do que você espera.

3. Para sincronizar uma base, use o fluxo de upsert desta skill (seção "Sem duplicar"). Um `POST` cego por cliente não atualiza ninguém.

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
| `address` | objeto | sim | Sem ele: `POST` responde 422 `Address is required`; `PUT` responde 500 |
| `externalId` | string | não | Seu id. Não evita duplicata no `POST`. Sem ele, a resposta traz o id da Zoppy em `externalId` |
| `email` | string | não | Gravado como veio: sem validar formato, sem `trim`, sem minúsculas |
| `birthDate` | string | não | `YYYY-MM-DD` ou ISO 8601. Texto que não vira data responde 400 |
| `gender` | string | não | Gravado em maiúsculas. Envie `m` ou `f` |
| `customFields` | array | não | Campos personalizados, fora do escopo desta skill |

Campos do `address`: `address1` (rua e número), `address2` (complemento), `city`, `state` (UF), `postcode` (CEP, com ou sem hífen), `country`, `latitude`, `longitude`. A API não valida nenhum deles: aceita `address: {}` e grava o endereço vazio, e converte tipo errado em texto (`true` vira `"1"`). Mande sempre `address1`, `city`, `state` e `postcode` como texto. Na resposta o `postcode` volta só com dígitos.

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

Só existe telefone brasileiro. Número estrangeiro que caiba no formato é aceito e lido como DDD brasileiro: `+1 415 555 0100` vira `14155550100`. O validador avisa nesse caso.

## Sem duplicar: o que o POST faz com dado repetido

| Situação no POST | Resultado |
|---|---|
| Telefone já cadastrado (em qualquer formato) | 200 com o cliente **existente, sem nenhuma alteração**: mesmo id, mesmo nome, e-mail e `externalId` antigos |
| Mesmo `externalId`, telefone diferente | Cria **outro** cliente. Depois disso, `GET /customers/external/{externalId}` devolve só um deles, sem garantia de qual |
| Mesmo e-mail, telefone diferente | Cria outro cliente |
| Telefone de um cliente já excluído | Cria cliente novo, com id novo |

Por isso, para sincronizar, faça upsert:

1. `GET /customers/external/{externalId}`. Se responder 200, faça `PUT /customers/{id}` com o payload.
2. Se responder 422, faça `POST /customers`.
3. Se o `externalId` da resposta do `POST` for diferente do que você mandou, o telefone já era de outro cadastro e nada foi gravado. Faça `PUT /customers/{id}` nesse id com o seu payload: ele atualiza os dados e grava o seu `externalId`.

Código completo: `assets/examples/03-upsert-por-externalid.mjs`.

## Atualizar (PUT)

O `PUT /customers/{id}` usa o id da Zoppy (o `id` da resposta, não o seu `externalId`) e exige os mesmos campos obrigatórios do `POST`.

- Sempre substituídos: `firstName`, `lastName`, `phone`, `address.address1`, `address.city`, `address.state`, `address.postcode`. Mande os valores atuais se não quiser mudar.
- Mantidos quando omitidos: `email`, `birthDate`, `gender`, `externalId`, `address.address2`, `address.country`, `address.latitude`, `address.longitude`. `email` e `birthDate` com `null` também mantêm o valor; não há como apagá-los.
- `gender: ""` apaga o gênero.
- `latitude` e `longitude` só são gravadas no `PUT`; no `POST` são ignoradas.
- Trocar o telefone é aceito. Em segundo plano, a Zoppy passa para o número novo o histórico ligado ao número antigo (os pedidos passam a ter o telefone novo). A API não impede usar um telefone que já pertence a outro cliente: os dois ficam com o mesmo número.
- A resposta do `PUT` pode trazer o `updatedAt` anterior. Para conferir, leia de volta com `GET /customers/{id}`.

## Datas e gênero

`birthDate` volta em UTC. `"1990-05-15"` e `"1990-05-15T00:00:00.000Z"` gravam `1990-05-15T00:00:00.000Z`. Com fuso, a API converte: `"1990-05-15T00:00:00-03:00"` vira `1990-05-15T03:00:00.000Z`. Com hora e sem fuso, a hora é lida no horário de Brasília: `"1990-05-15 10:00"` vira `1990-05-15T13:00:00.000Z`. `"15/05/1990"` e `""` respondem 400 `birthDate must be a Date instance`. Prefira `YYYY-MM-DD`.

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
| 422 | `{"message":"Address is required"}` | `POST` sem `address` |
| 422 | `{"message":"Customer not found"}` | busca sem resultado |
| 404 | `{"message":"Customer not found","error":"Not Found"}` | `PUT` ou `DELETE` com id que não existe (inclui excluir duas vezes) |
| 500 | `{"statusCode":500,"message":"Internal server error"}` | `PUT` sem `address` |

No 400 `message` é uma lista; nos demais é texto.

## Exemplos e referências

- `assets/examples/01-ciclo-cliente.mjs`: criar, buscar por externalId, atualizar, conferir e excluir.
- `assets/examples/02-ciclo-cliente.curl.sh`: o mesmo ciclo em curl.
- `assets/examples/03-upsert-por-externalid.mjs`: upsert sem duplicar, incluindo telefone já cadastrado.
- `references/campos-e-respostas.md`: resposta completa, o que é gravado campo a campo, listagem.
- `references/casos-de-borda.md`: cada caso de borda com o pedido e a resposta reais.
