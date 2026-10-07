---
name: zoppy-partners-api
description: "Visão geral da Partners API da Zoppy e ponto de partida de qualquer integração: autenticação com Authorization Bearer mais o header zoppy-access, URLs base, formato de rota, paginação (after, page, pageSize), datas ISO 8601 e fuso, formato de erro, ordem de envio, idempotência e qual skill usar para cada recurso. Use antes de escrever código que chama a Partners API e ao depurar 401, 403 com página HTML, 422 Invalid after date, datas gravadas 3 horas fora ou paginação que pula registros. Gatilhos: Partners API Zoppy, integrar com a Zoppy, token da Zoppy, zoppy-access, Just a moment, listar clientes Zoppy, paginação Zoppy, ordem de envio; Zoppy Partners API authentication, base URL, pagination, error format, integration order. Não use para os campos de cada recurso: clientes em zoppy-partners-clientes, produtos em zoppy-partners-produtos, pedidos, lojas e vendedores em zoppy-partners-pedidos, carrinho em zoppy-partners-carrinho-abandonado, cupons e webhooks em zoppy-partners-cupons-webhooks."
---

# Partners API da Zoppy: visão geral e roteamento

Esta skill cobre o que vale para todos os recursos. Os campos de cada recurso ficam nas skills
de recurso (tabela de roteamento no fim). Esta skill não tem payload próprio e por isso não tem
schema: para validar um corpo de requisição, use o validador da skill do recurso.

## Antes de gerar código

1. Leia as credenciais de variáveis de ambiente, nunca do código:
   `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS`, `ZOPPY_PARTNERS_BASE_URL`. Falhe cedo dizendo qual
   variável falta. Nunca escreva o token em arquivo versionado, log ou mensagem de erro.
2. Mande sempre os três headers: `Authorization: Bearer <token>`, `zoppy-access: <chave>` e
   `Content-Type: application/json`.
3. Datas sempre em ISO 8601 com fuso (`2026-09-05T10:26:00-03:00` ou `2026-09-05T13:26:00Z`).
4. Siga a ordem de envio desta página e guarde o `id` que a Zoppy devolve: pedidos e carrinhos
   referenciam cliente e produto pelo `id` da Zoppy, não pelo seu `externalId`.
5. Antes de montar o corpo de um recurso, abra a skill do recurso e rode o validador dela.

## URLs base

| Ambiente | URL base |
|---|---|
| Produção | `https://api-partners.zoppy.com.br` |
| Staging (homologação) | `https://api-partners-staging.zoppy.com.br` |

- As rotas ficam direto na raiz, sem prefixo `/api` e sem versão: `GET {base}/customers`.
  `GET {base}/api/customers` e `GET {base}/v1/customers` respondem
  `404 {"message":"Cannot GET /api/customers...","error":"Not Found","statusCode":404}`.
- Use as credenciais que a Zoppy entregar para o ambiente em que o código vai rodar.

## Autenticação

Dois headers, ambos obrigatórios em toda requisição:

| Header | Valor | Quem confere |
|---|---|---|
| `zoppy-access` | chave fornecida pela Zoppy | camada de borda, antes da API |
| `Authorization` | `Bearer <token>` | a API |

O que acontece quando falta ou erra cada um:

| Situação | Status | Corpo |
|---|---|---|
| Sem `zoppy-access`, ou com valor errado | 403 | página HTML (`Content-Type: text/html`, título `Just a moment...`), não JSON |
| Sem `Authorization` | 401 | `{"message":"Authorization header authorization not found","error":"Unauthorized","statusCode":401}` |
| Token desconhecido | 401 | `{"message":"External token not found","error":"Unauthorized","statusCode":401}` |
| Prefixo `bearer` em minúsculas | 401 | `{"message":"External token not found",...}` (só `Bearer ` com B maiúsculo é removido) |

Regras práticas:

- Um 403 com HTML quase sempre é `zoppy-access` ausente ou errado. Não tente fazer `JSON.parse`
  desse corpo: trate pelo status e mostre "confira o header zoppy-access".
- O token identifica a empresa. Não existe parâmetro de empresa: tudo que você lê e grava fica
  na empresa dona do token. `GET {base}/companies` devolve a empresa do token e serve como
  teste de credencial.
- O token não expira por tempo: ele não carrega data de expiração e um token emitido em 2025
  continua aceito. Não implemente renovação de token.

## Formato das requisições e respostas

- Corpo em JSON com `Content-Type: application/json`. Sem esse header o corpo é ignorado e a API
  responde 400 como se todos os campos faltassem (ex. `["phone must be a string", ...]`).
- JSON malformado: `400 {"message":"Unexpected end of JSON input","error":"Bad Request","statusCode":400}`.
- Campos desconhecidos ou com nome errado são ignorados em silêncio. `first_name` no lugar de
  `firstName` não gera aviso: o 400 só reclama que `firstName` falta. Confira os nomes no schema
  da skill do recurso.
- Número mandado como texto é recusado: `"subtotal": "100.00"` dá
  `400 ["subtotal must be a number conforming to the specified constraints"]`. Mande `100.0`.
- Respostas de sucesso de `GET`, `POST`, `PUT` e `DELETE` vêm com status 200 (não 201).
- `DELETE` bem-sucedido responde `{"result":true}`.

## Datas

Mande sempre data e hora com fuso. O fuso de referência da API é o de Brasília (UTC-3), e é ele
que entra quando o fuso falta. Datas voltam sempre em UTC (`...Z`).

Corpo de requisição (ex. `createdAt` de pedido), valor gravado e devolvido:

| Você manda | A Zoppy grava | Observação |
|---|---|---|
| `2026-09-05T10:26:00-03:00` | `2026-09-05T13:26:00.000Z` | certo |
| `2026-09-05T13:26:00Z` | `2026-09-05T13:26:00.000Z` | certo |
| `2026-09-05T10:26:00` (sem fuso) | `2026-09-05T13:26:00.000Z` | lido como horário de Brasília |
| `2026-09-05` (só data) | `2026-09-05T00:00:00.000Z` | meia-noite UTC, ou seja 21h do dia 4 em Brasília |
| `05/09/2026 10:26` | `2026-05-09T13:26:00.000Z` | lido como mês/dia: vira 9 de maio |
| `ontem` | não grava | `400 ["createdAt must be a Date instance"]` |

Filtros de listagem (`after`, `updatedAt` na query):

| Você manda em `after` | A API filtra a partir de |
|---|---|
| `2026-09-05T00:00:00Z` | 05/09 00:00 UTC |
| `2026-09-05T00:00:00` (sem fuso) | 05/09 00:00 de Brasília (03:00 UTC) |
| `2026-09-05` (só data) | 05/09 00:00 de Brasília (03:00 UTC), diferente do corpo |
| `08/10/2026` | 10 de agosto (mês/dia) |
| `1759859098000` (epoch) | não filtra: `422 Invalid after date` |

Detalhe e provas em [references/paginacao-e-datas.md](references/paginacao-e-datas.md).

## Paginação

Todas as listagens (`GET /customers`, `/products`, `/orders`, `/abandoned-carts`, `/stores`,
`/users`, `/nps`, `/campaigns`) usam os mesmos parâmetros:

| Parâmetro | Obrigatório | Regra | Erro (422) quando falha |
|---|---|---|---|
| `after` | sim | data; traz registros com data de criação maior ou igual | `Invalid after date` (ausente ou inválida) |
| `page` | sim | número, começa em 1 | `Page parameter is required`, `Page needs to be bigger than 0` |
| `pageSize` | sim | 1 a 50 | `Page size parameter is required`, `Page size needs to be bigger than 0`, `Page size needs to be less than or equal 50` |
| `updatedAt` | não | data; traz só registros atualizados a partir dela | `Invalid updatedAt date` |

Por que `GET /products` sem `after` responde 422: `after` é obrigatório em toda listagem e é
conferido antes de `page` e `pageSize`. Sem ele a resposta é sempre
`422 {"message":"Invalid after date","error":"Unprocessable Entity","statusCode":422}`.
Para listar tudo, mande uma data antiga, ex. `after=2020-01-01T00:00:00-03:00`.

Resposta paginada:

```json
{
  "pagination": { "page": 1, "pageSize": 2, "totalRecords": 112, "totalPages": 56 },
  "data": [ { "id": "00dabfeb-...", "externalId": "...", "createdAt": "2026-09-14T16:07:15.000Z" } ]
}
```

- `totalPages` = `totalRecords / pageSize` arredondado para cima. Sem registros:
  `totalRecords: 0`, `totalPages: 0`, `data: []`.
- Página além da última responde 200 com `data: []`.
- A ordem dos itens não é por data: a API não fixa ordenação e, nos testes, os itens vieram
  ordenados pelo `id`. Um registro criado durante a varredura pode cair numa página que você já
  leu. Para sincronizar: percorra até `page >= totalPages`, junte por `id` sem duplicar e, na
  rodada seguinte, use `updatedAt` com a hora de início da rodada anterior.

## Erros

Todo erro da API (fora o 403 da borda) vem como JSON
`{"message": ..., "error": ..., "statusCode": ...}`. `message` é texto em erros de regra e lista
de textos em erros de validação de campo.

| Status | Quando | Exemplo de corpo |
|---|---|---|
| 400 | campo com tipo errado, obrigatório ausente, JSON malformado | `{"message":["phone must be a string","firstName must be a string"],"error":"Bad Request","statusCode":400}` |
| 401 | sem `Authorization` ou token desconhecido | `{"message":"External token not found","error":"Unauthorized","statusCode":401}` |
| 403 | sem `zoppy-access` ou chave errada | página HTML `Just a moment...` |
| 404 | rota inexistente; pedido, produto, carrinho ou loja inexistente | `{"message":"Order not found","error":"Not Found","statusCode":404}` |
| 422 | regra de negócio: paginação inválida, `externalId` repetido em pedido ou carrinho, cliente não encontrado | `{"message":"External id already exists","error":"Unprocessable Entity","statusCode":422}` |
| 500 | falha não tratada | `{"statusCode":500,"message":"Internal server error"}` |

- Cliente inexistente responde 422 (`Customer not found`), não 404, em `GET /customers/{id}` e
  `GET /customers/external/{externalId}`. Trate 404 e 422 como "não encontrado" ao buscar.
- Quando a regra tem mais de um problema, as mensagens vêm juntas no mesmo texto, separadas
  por vírgula (ex. `"User email already in use., Password does not attend security standarts."`).
- 40 requisições paralelas foram atendidas sem 429. A API não publica limite de taxa; se receber
  429, espere e tente de novo com intervalo crescente.

Catálogo completo com corpos reais em [references/erros.md](references/erros.md).

## Ordem de envio

1. **Lojas e vendedores** (`/stores`, `/users`). O pedido aponta a loja por `storeId` (id da
   Zoppy) ou por `store` (`externalId`/`name`). `storeId` inexistente dá
   `422 Store not found for this company`; `store` que não bate com nenhuma loja não dá erro e o
   pedido vai para a loja padrão `Integrador Externo`. Vendedor não encontrado não dá erro: o
   pedido fica sem vendedor (`userId: null`).
2. **Clientes** (`/customers`). Pedido e carrinho exigem `customerId` com o `id` da Zoppy.
   Cliente inexistente dá `422 Customer not found`.
3. **Produtos** (`/products`). Itens de pedido e carrinho usam `productId` com o `id` da Zoppy.
   Item com produto inexistente é descartado em silêncio: o pedido é criado sem esse item.
4. **Pedidos** (`/orders`).
5. **Carrinhos abandonados** (`/abandoned-carts`).

## Idempotência: reenviar o mesmo registro

Cada recurso reage diferente ao reenvio. Detalhes na skill de cada um.

| Recurso | Chave que a API usa no `POST` | Reenvio |
|---|---|---|
| Loja | `externalId` | atualiza o nome e devolve a mesma loja (mesmo `id`) |
| Vendedor | `email` | `422 User email already in use.` |
| Cliente | telefone, não o `externalId` | mesmo telefone devolve o cliente existente sem alterar nada; mesmo `externalId` com outro telefone cria outro cliente. Veja zoppy-partners-clientes |
| Produto | `name`, não o `externalId` | mesmo nome devolve o produto existente sem alterar preço nem `externalId`. Veja zoppy-partners-produtos |
| Pedido | `externalId` | `422 External id already exists`. Como alterar um pedido: veja zoppy-partners-pedidos |
| Carrinho | `externalId` | `422 External id already exists`. Veja zoppy-partners-carrinho-abandonado |

Num reenvio automático (fila, retry), trate `422 External id already exists` de pedido e
carrinho como "já foi": busque o registro por `GET /orders/external/{externalId}` ou
`GET /abandoned-carts/external/{externalId}`, guarde o `id` e siga.

## Qual skill usar

| Recurso | Rotas | Skill |
|---|---|---|
| Clientes | `/customers` | zoppy-partners-clientes |
| Produtos | `/products` | zoppy-partners-produtos |
| Pedidos, lojas, vendedores | `/orders`, `/stores`, `/users` | zoppy-partners-pedidos |
| Carrinho abandonado | `/abandoned-carts` | zoppy-partners-carrinho-abandonado |
| Cupons e webhooks | `/coupons`, `/coupons-config`, `/webhooks` | zoppy-partners-cupons-webhooks |
| NPS, campanhas, empresa, campos personalizados | `/nps`, `/campaigns`, `/companies`, `/custom-field` | fora do escopo destas skills; veja a doc pública da Partners API |

## Exemplos

Rodam contra a conta das variáveis de ambiente, só leem dados e saem com código 0 quando a
resposta confere:

- [assets/examples/01-listar-clientes.mjs](assets/examples/01-listar-clientes.mjs): autentica,
  lista uma página de clientes, confere o formato paginado e percorre todas as páginas sem
  duplicar.
- [assets/examples/02-listar-clientes.curl.sh](assets/examples/02-listar-clientes.curl.sh): o
  mesmo em curl.
- [assets/examples/03-erros-de-autenticacao.mjs](assets/examples/03-erros-de-autenticacao.mjs):
  mostra o 403 sem `zoppy-access`, o 401 sem `Authorization` e o 422 sem `after`.
