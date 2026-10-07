# Clientes: casos de borda com pedido e resposta reais

## Sumário

- Telefone
- Deduplicação no POST
- Campos obrigatórios e tipos
- Datas
- Atualização (PUT)
- Exclusão
- Cliente e pedido

Os ids e telefones abaixo são de dados de teste.

## Telefone

| `phone` enviado no POST | Resposta |
|---|---|
| `"11900001001"` | 200, `"phone":"11900001001"` |
| `"1100001006"` | 200, `"phone":"11900001006"` |
| `"011900001008"` | 200, `"phone":"11900001008"` |
| `"5501190000 1009"` | 200, `"phone":"11900001009"` |
| `"(11) 2000-0001"` | 200, `"phone":"1120000001"` |
| `"+1 415 555 0100"` | 200, `"phone":"14155550100"` |
| `"001 415 000 8005"` | 200, `"phone":"14150008005"` |
| `"55119000806"` (55 + DDD + 7 dígitos) | 200, `"phone":"55119000806"` (DDD 55) |
| `"123"`, `"119000010"`, `"119000010101"`, `""` | 422 `{"message":"Phone invalid","error":"Unprocessable Entity","statusCode":422}` |
| `11900001015` (número) | 400 `{"message":["phone must be a string"],"error":"Bad Request","statusCode":400}` |

`GET /customers/phone/{phone}` acha o mesmo cliente com `11900001001`, `5511900001001`, `+5511900001001`, `(11) 90000-1001` e `011900001001` (codifique `+`, espaço e parênteses na URL).

## Deduplicação no POST

Cliente existente: telefone `11900001001`, `externalId` `...-a`, nome `João Pedro Da Silva`.

| POST | Resultado |
|---|---|
| `phone: "+55 (11) 90000-1001"`, `externalId: "...-b"`, nome `Outro Nome` | 200 com o mesmo id, `externalId` `...-a`, nome `João Pedro Da Silva` |
| `phone: "11900001002"`, `externalId: "...-a"` | 200 com id novo; dois clientes com o mesmo `externalId` |
| `phone: "11900001003"`, `email` igual ao do existente | 200 com id novo |

Com dois clientes no mesmo `externalId`, três chamadas seguidas de `GET /customers/external/...-a` devolveram o mais novo; não conte com isso.

## Campos obrigatórios e tipos

| POST | Resposta |
|---|---|
| `{}` | 400 `{"message":["phone must be a string","firstName must be a string","lastName must be a string"]}` |
| sem `address` | 422 `{"message":"Address is required"}` |
| `"phone": "123"` e sem `address` | 422 `{"message":"Phone invalid, Address is required"}` |
| `"address": {}` | 200, endereço gravado vazio |
| `"externalId": 123` | 400 `{"message":["externalId must be a string"]}` |
| `"email": 12345` | 200, `"email":12345` na resposta |
| `"gender": 1` | 400 `{"message":["gender must be a string"]}` |
| `"gender": "masculino"` | 200, `"gender":"MASCULINO"` |
| `"gender": ""` | 200, `"gender":null` |
| sem `externalId` | 200, `externalId` igual ao `id` |

## Datas

| `birthDate` | Resposta |
|---|---|
| `"1990-05-15"` | `"1990-05-15T00:00:00.000Z"` |
| `"1990-05-15T00:00:00-03:00"` | `"1990-05-15T03:00:00.000Z"` |
| `"1990-05-15 10:00"` | `"1990-05-15T13:00:00.000Z"` (lida no horário de Brasília) |
| `642729600000` | `"1990-05-15T00:00:00.000Z"` |
| `null` | `null` |
| `"15/05/1990"` ou `""` | 400 `{"message":["birthDate must be a Date instance"]}` |
| `"1990-02-30"` | 200, `"1990-03-02T00:00:00.000Z"` (a data rola) |

## Atualização (PUT)

| PUT /customers/{id} | Resposta |
|---|---|
| id que não existe (ou não é UUID) | 404 `{"message":"Customer not found","error":"Not Found","statusCode":404}` |
| sem `phone` e `firstName` | 400 `{"message":["phone must be a string","firstName must be a string"]}` |
| sem `address` | 500 `{"statusCode":500,"message":"Internal server error"}` |
| `"address": {}` | 200; a resposta vem sem `address1`, `city`, `state` e com `postcode: ""`, mas o `GET` mostra os valores anteriores |
| `"address": {"address1": null, "city": null, "state": null, "postcode": null}` | 200; esses campos apagados |
| `"email": ""` | 200; e-mail apagado (`""`) |
| `"address": {"address2": ""}` | 200; complemento apagado |
| `"externalId": ""` | 200; `externalId` passa a ser o `id`; o externalId antigo responde 422 |
| `"birthDate": ""` | 400 `birthDate must be a Date instance` |
| `"address": {"latitude": "abc"}` | 200; resposta ecoa `"abc"`, `GET` mostra `0` |
| `"phone": "123"` | 422 `Phone invalid` |
| sem `email`, `birthDate`, `gender`, `externalId`, `address2`, `country`, `latitude`, `longitude` | 200; esses campos mantêm o valor anterior |
| `null` em `email`, `birthDate`, `gender`, `address2`, `country`, `latitude`, `longitude` | 200; valores anteriores mantidos |
| `"gender": ""` | 200; gênero apagado (`null`) |
| `"externalId": "novo"` | 200; `externalId` trocado |
| `"address": {"latitude": -22.9, "longitude": -47.06, ...}` | 200; coordenadas gravadas |
| `phone` de outro cliente | 200; os dois clientes ficam com o mesmo telefone; busca por telefone devolve um dos dois |
| `externalId` novo num cliente que tinha outro `externalId` | 200; o `externalId` antigo passa a responder 422 |

A resposta do `PUT` trouxe `updatedAt` `17:44:34` e o `GET` logo depois trouxe `17:46:11`. Confira sempre com `GET`.

## Exclusão

| Chamada | Resposta |
|---|---|
| `DELETE /customers/{id}` | 200 `{"result":true}` |
| `GET /customers/{id}` depois | 422 `Customer not found` |
| `DELETE /customers/{id}` de novo | 404 `{"message":"Customer not found","error":"Not Found","statusCode":404}` |
| `POST` com o mesmo telefone depois | 200 com id novo |
| `POST` com o mesmo telefone depois de excluir o cliente logo após criar um pedido concluído para ele | 200 com id novo e o seu `externalId`, mas `address` é o endereço antigo (`"address1":"Rua Orfa Rapida, 1"`); o `address` enviado foi ignorado |

## Cliente e pedido

| Passo | Resultado |
|---|---|
| `POST /orders` com `customerId` = id da Zoppy | 200; `customer.address.id` igual ao `address.id` do cliente |
| `POST /orders` com `customerId` = `externalId` do cliente | 422 `{"message":"Customer not found"}` |
| `PUT /customers/{id}` com endereço e telefone novos, depois `GET /orders/{id}` | o pedido mostra o endereço novo e o telefone novo |
| `DELETE /customers/{id}`, depois `GET /orders/{id}` | 200; pedido existe com `"customer":null` |
