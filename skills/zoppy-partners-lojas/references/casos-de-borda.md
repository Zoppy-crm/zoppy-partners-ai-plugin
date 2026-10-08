# Casos de borda de lojas

Cada linha foi enviada à Partners API em homologação. Nomes e códigos encurtados: `LJ CENTRO`
(código `loja-01`), `Loja São Paulo` (`loja-sp`), duas lojas chamadas `DUP` (`dup-1` criada antes de
`dup-2`) e `DEL` (excluída).

## Cadastro (`/stores`)

| Envio | Resultado |
|---|---|
| `POST {externalId:"loja-01", name:"LJ CENTRO"}` | 200, loja nova, `isEcommerce:false` |
| `POST` de novo com `name:"LJ CENTRO 2"` | 200, mesmo `id`, `name` trocado |
| `POST {externalId:"LOJA-01", name:"LJ CENTRO 3"}` | 200, mesmo `id`, `externalId` continua `loja-01`, `name` trocado |
| `GET /stores/external/LOJA-01` | 200, a loja `loja-01` |
| `POST {name:"SEM CODIGO"}` duas vezes | duas lojas, `id` diferentes, resposta sem `externalId` |
| `POST {externalId:"", name:"X"}` duas vezes | duas lojas |
| `POST {externalId:"loja-02"}` (sem `name`) | 400 `["name must be a string"]` |
| `POST {externalId:123, name:"X"}` | 400 `["externalId must be a string"]` |
| `POST {externalId:"vazio", name:""}` | 200, loja com `name:""` |
| `POST {..., name:"  LJ  BH  "}` | 200, `name` gravado com todos os espaços |
| `POST {..., isEcommerce:"false"}` (texto) | 200, `isEcommerce:true` |
| `POST {..., isEcommerce:true}` e depois `POST` sem `isEcommerce` | continua `true` |
| `PUT {externalId, name}` sem `isEcommerce` numa loja `true` | `isEcommerce:false` |
| `PUT {name}` sem `externalId` | 200, resposta sem `externalId`; `GET` mostra o código mantido |
| `PUT {externalId}` sem `name` | 400 `["name must be a string"]` |
| `POST` com `address` e `cnpj` | 200, campos ignorados, resposta só com os campos da loja |
| `GET`, `PUT` ou `DELETE /stores/00000000-...` e `GET /stores/abc` | 404 `Store not found` |
| `DELETE /stores/{id}` | 200 `{"result":true}`; depois `GET` por id e por código 404, e some da listagem |
| `DELETE` de novo | 404 `Store not found` |
| `POST` com o código da loja excluída | 200, loja nova com outro `id` |
| `PUT` na loja `D2` com o código da loja `D1` | 200; as duas ficam ativas com o mesmo `externalId`; `GET /stores/external/<código>` e `store.externalId` no pedido pegam uma delas (em duas rodadas, uma vez cada) |

## Pedido apontando a loja (`POST /orders`)

| Envio no pedido | Loja gravada |
|---|---|
| nada | Integrador Externo |
| `storeId` de `LJ CENTRO` | LJ CENTRO |
| `store:{externalId:"loja-01"}` ou `{externalId:"LOJA-01"}` | LJ CENTRO |
| `store:{name:"LJ CENTRO"}` ou `{name:"lj centro"}` | LJ CENTRO |
| `store:{name:"Loja Sao Paulo"}` (sem acento) | Loja São Paulo |
| `store:{name:"LJ CENTRO "}` (espaço no fim) | Integrador Externo |
| `store:{name:"LJ BH"}` para a loja `"  LJ  BH  "` | Integrador Externo |
| `store:{name:"DUP"}` três vezes | as três em `dup-2` (a mais nova) |
| `store:{name:"LJ CENTRO", externalId:"loja-sp"}` | LJ CENTRO |
| `store:{externalId:"nao-existe", name:"LJ CENTRO"}` | LJ CENTRO |
| `store:{name:"DEL"}` (loja excluída) | Integrador Externo |
| `storeId` de `LJ CENTRO` + `store:{externalId:"loja-sp"}` | LJ CENTRO |
| `store:{}`, `storeId:""` ou `store:"LJ CENTRO"` (texto) | Integrador Externo |
| `storeId:""` + `store:{externalId:"loja-01"}` | LJ CENTRO (vale o `store`) |
| `store:{externalId:""}`, com uma loja de código vazio na conta | a loja de código vazio |
| `store:{externalId:"", name:"LJ CENTRO"}`, idem | a loja de código vazio, não a LJ CENTRO |
| `store:{name:""}`, com uma loja sem nome na conta | a loja sem nome |
| `storeId` da loja excluída | 422 `Store "DEL" is inactive and cannot receive orders (storeId: ...). Reactivate it in the Zoppy panel, under the integration that owns this store.` |
| `storeId` inexistente, `"abc"` ou de loja de outra conta | 422 `Store not found for this company (storeId: ...)` |

## Pedido já gravado (`PUT /orders/{id}`)

| Envio no `PUT` (pedido inteiro) | Resultado |
|---|---|
| `storeId` da filial, num pedido `completed` da loja padrão, sem `couponCode`, vendedor e `provider` | loja trocada; `total`, `subtotal`, `discount`, `shipping`, `status`, `createdAt`, `completedAt`, produto e quantidade dos itens, cupom, vendedor, `provider` e `externalId` iguais; itens com `id` novo e `updatedAt` do pedido na hora do `PUT` |
| sem `storeId` e sem `store` | loja mantida |
| `store:{externalId:"loja-sp"}` | Loja São Paulo |
| `store:{name:"nao existe"}` num pedido da LJ CENTRO | Integrador Externo |
| `store:{}` ou `store:"qualquer"` num pedido da LJ CENTRO | Integrador Externo |
| `store:null` ou `storeId:""` num pedido da LJ CENTRO | loja mantida |
| `storeId` da loja excluída | 422 `Store "DEL" is inactive ...` |
| só `{storeId}` | 400 `["subtotal must be a number conforming to the specified constraints", ...]` |

## Depois de excluir a loja

Um pedido gravado na loja continua com o mesmo `storeId` depois do `DELETE /stores/{id}`.

## Listagem de pedidos

`GET /orders?after=...` traz `storeId` em cada pedido, sem o nome da loja. Um parâmetro `storeId` na
query é ignorado: o `totalRecords` é o mesmo com e sem ele.
