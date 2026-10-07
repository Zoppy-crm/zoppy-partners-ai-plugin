# Clientes: campos, resposta e listagem

## Resposta de um cliente

Todas as rotas que devolvem cliente (`GET`, `POST`, `PUT`) usam este formato:

```json
{
  "id": "1a817ffb-1b5a-46ee-9d4a-7198213e5985",
  "externalId": "cli-456",
  "email": "skills-test+1@zoppy.com.br",
  "phone": "11900001001",
  "firstName": "João Pedro",
  "lastName": "Da Silva",
  "birthDate": "1990-05-15T00:00:00.000Z",
  "gender": "M",
  "position": null,
  "address": {
    "id": "1a65829c-5c9e-4d0b-9340-82b9a55b6881",
    "address1": "Rua das Flores, 123",
    "address2": "Apto 42",
    "city": "São Paulo",
    "state": "SP",
    "postcode": "01001000",
    "country": "BR",
    "latitude": null,
    "longitude": null,
    "createdAt": "2026-10-07T17:44:34.000Z",
    "updatedAt": "2026-10-07T17:44:34.000Z"
  },
  "createdAt": "2026-10-07T17:44:34.000Z",
  "updatedAt": "2026-10-07T17:44:34.000Z"
}
```

| Campo | Observação |
|---|---|
| `id` | Id da Zoppy. É o que `PUT`, `DELETE` e o `customerId` do pedido usam |
| `externalId` | O seu id; se o cliente não tiver, vem igual ao `id` |
| `phone` | DDD + número, sem 55 |
| `firstName`, `lastName` | Inicial de cada palavra em maiúscula, resto em minúscula, espaços repetidos removidos |
| `birthDate` | UTC ou `null` |
| `gender` | Em maiúsculas ou `null` |
| `position` | Somente leitura; `null` em cliente novo |
| `address.postcode` | Só os dígitos do CEP enviado |
| `coupon` | Só aparece quando há cupom não usado ligado ao telefone do cliente |

Na resposta do `POST`, campos que você não mandou podem vir ausentes em vez de `null` (por exemplo `address2`, `country`, `latitude`). Leia de volta com `GET` para ver o registro completo.

## O que cada campo enviado vira

| Enviado | Gravado |
|---|---|
| `"firstName": "joão  pedro"` | `"João Pedro"` |
| `"lastName": "DA silva"` | `"Da Silva"` |
| `"firstName": ""` | `""` (aceito) |
| `"email": " Skills-Test+5@Zoppy.com.br "` | igual, com espaços e maiúsculas |
| `"email": "nao-e-email"` | `"nao-e-email"` |
| `"gender": "m"` | `"M"` |
| `"birthDate": "1990-05-15"` | `"1990-05-15T00:00:00.000Z"` |
| `"birthDate": 642729600000` | `"1990-05-15T00:00:00.000Z"` (milissegundos desde 1970) |
| `"address": {"postcode": "01001-000"}` | resposta `"01001000"` |
| `"address": {"address1": 123, "city": true}` | `"123"` e `"1"` |
| `"address": {"latitude": -23.55}` no `POST` | `null` (ignorado) |
| `"address": {"latitude": "abc"}` no `PUT` | `0` |
| `"birthDate": "1990-02-30"` | `"1990-03-02T00:00:00.000Z"` |
| `"cpf": "..."`, `"optIn": false` | nada (ignorados) |

## Listagem

`GET /customers?after=2026-10-07&page=1&pageSize=50&updatedAt=2026-10-07T17:46:00Z`

| Parâmetro | Regra | Erro |
|---|---|---|
| `after` | Obrigatório; data de criação mínima | ausente ou inválido: 422 `Invalid after date` |
| `page` | Obrigatório, a partir de 1 | ausente: 422 `Page parameter is required`; `0`: 422 `Page needs to be bigger than 0` |
| `pageSize` | Obrigatório, de 1 a 50 | `51`: 422 `Page size needs to be less than or equal 50` |
| `updatedAt` | Opcional; atualização mínima | |

Resposta: `{"pagination":{"page":1,"pageSize":2,"totalRecords":5,"totalPages":3},"data":[ ...clientes... ]}`.

Paginação e filtros comuns a todos os recursos: skill `zoppy-partners-api`.
