# Catálogo de erros da Partners API

Corpos reais observados em staging. Todo erro da API vem como JSON
`{"message": ..., "error": ..., "statusCode": ...}`, com uma exceção: o 403 da camada de borda,
que é uma página HTML.

## Como tratar no código

```js
const response = await fetch(url, { headers });
const text = await response.text();
if (response.status === 403 && !response.headers.get('content-type')?.includes('json')) {
    throw new Error('403 na borda: confira o header zoppy-access');
}
const body = text ? JSON.parse(text) : null;
if (!response.ok) {
    const detail = Array.isArray(body?.message) ? body.message.join('; ') : body?.message;
    throw new Error(`${response.status}: ${detail}`);
}
```

## 400 Bad Request

Validação de campo (tipo errado, obrigatório ausente). `message` é uma lista.

| Causa | Corpo |
|---|---|
| Corpo vazio em `POST /customers` | `{"message":["phone must be a string","firstName must be a string","lastName must be a string"],"error":"Bad Request","statusCode":400}` |
| Sem `Content-Type: application/json` | mesmo corpo acima: o JSON enviado é ignorado |
| JSON malformado | `{"message":"Unexpected end of JSON input","error":"Bad Request","statusCode":400}` |
| Número como texto (`"subtotal":"100.00"`) | `{"message":["subtotal must be a number conforming to the specified constraints"],"error":"Bad Request","statusCode":400}` |
| Data que não é data (`"createdAt":"ontem"`) | `{"message":["createdAt must be a Date instance"],"error":"Bad Request","statusCode":400}` |
| E-mail inválido em `POST /users` | `{"message":["email must be an email"],"error":"Bad Request","statusCode":400}` |
| `DELETE /users/{id}` inexistente | `{"message":"Usuário não encontrado","error":"Bad Request","statusCode":400}` |

Campo com nome errado (ex. `first_name`) não aparece no erro: ele é ignorado e o 400 aponta o
campo certo que ficou faltando.

## 401 Unauthorized

| Causa | Corpo |
|---|---|
| Sem header `Authorization` | `{"message":"Authorization header authorization not found","error":"Unauthorized","statusCode":401}` |
| Token desconhecido | `{"message":"External token not found","error":"Unauthorized","statusCode":401}` |
| `bearer` minúsculo | `{"message":"External token not found","error":"Unauthorized","statusCode":401}` |

## 403 Forbidden

Sem `zoppy-access` ou com valor errado. Resposta da camada de borda, antes da API:
`Content-Type: text/html; charset=UTF-8`, corpo começando com
`<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title>`. Acontece em qualquer
rota e também quando os dois headers faltam.

## 404 Not Found

| Causa | Corpo |
|---|---|
| Rota inexistente, ou com prefixo `/api` ou `/v1` | `{"message":"Cannot GET /rota-que-nao-existe","error":"Not Found","statusCode":404}` |
| `GET` ou `DELETE /orders/{id}`, `GET /orders/external/{externalId}` inexistente | `{"message":"Order not found","error":"Not Found","statusCode":404}` |
| `PUT /orders/{id}` inexistente | `{"message":"Pedido não encontrado","error":"Not Found","statusCode":404}` |
| `GET`, `PUT` ou `DELETE /products/{id}`, `GET /products/external/{x}`, `GET /products/name/{x}` inexistente | `{"message":"Product not found","error":"Not Found","statusCode":404}` |
| `GET`, `PUT` ou `DELETE /abandoned-carts/{id}`, `GET /abandoned-carts/external/{x}` inexistente | `{"message":"Abandoned Cart not found","error":"Not Found","statusCode":404}` |
| `GET`, `PUT` ou `DELETE /stores/{id}`, `GET /stores/external/{x}` inexistente | `{"message":"Store not found","error":"Not Found","statusCode":404}` |
| `PUT` ou `DELETE /customers/{id}` inexistente | `{"message":"Customer not found","error":"Not Found","statusCode":404}` |
| `GET /users/{id}` inexistente | `{"message":"Usuário não encontrado","error":"Not Found","statusCode":404}` |

## 422 Unprocessable Entity

Regra de negócio. `message` é texto; várias regras quebradas vêm no mesmo texto separadas por
vírgula.

| Causa | Corpo |
|---|---|
| Listagem sem `after`, ou `after` inválido | `{"message":"Invalid after date","error":"Unprocessable Entity","statusCode":422}` |
| Listagem sem `page` ou com `page` não numérico | `{"message":"Page parameter is required",...}` |
| `page=0` | `{"message":"Page needs to be bigger than 0",...}` |
| Listagem sem `pageSize` | `{"message":"Page size parameter is required",...}` |
| `pageSize=0` | `{"message":"Page size needs to be bigger than 0",...}` |
| `pageSize=51` | `{"message":"Page size needs to be less than or equal 50",...}` |
| `updatedAt` inválido | `{"message":"Invalid updatedAt date",...}` |
| `GET /customers/{id}`, `/customers/external/{externalId}` ou `/customers/phone/{telefone}` inexistente | `{"message":"Customer not found","error":"Unprocessable Entity","statusCode":422}` |
| `GET /users/email/{email}` inexistente | `{"message":"Usuário não encontrado","error":"Unprocessable Entity","statusCode":422}` |
| Pedido ou carrinho com `externalId` já usado | `{"message":"External id already exists","error":"Unprocessable Entity","statusCode":422}` |
| Pedido ou carrinho com `customerId` inexistente | `{"message":"Customer not found","error":"Unprocessable Entity","statusCode":422}` |
| Pedido com `storeId` inexistente | `{"message":"Store not found for this company (storeId: 00000000-0000-0000-0000-000000000000)",...}` |
| Vendedor com e-mail já usado e senha fraca | `{"message":"User email already in use., Password does not attend security standarts.",...}` |

## 500 Internal Server Error

Falha não tratada. O corpo não diz a causa:
`{"statusCode":500,"message":"Internal server error"}`. Confira o payload contra o schema da
skill do recurso antes de tentar de novo.

## 429

Se aparecer, espere e repita com intervalo crescente.
