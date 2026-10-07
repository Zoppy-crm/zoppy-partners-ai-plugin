# Produtos: campos, respostas e listagem

## Corpo do POST /products e do PUT /products/{id}

Os dois endpoints aceitam o mesmo corpo. Tipos conferidos contra a API: valor com tipo errado volta 400.

| Campo | Tipo aceito | Obrigatório | Validação e efeito |
|---|---|---|---|
| `name` | string | sim | Vazio ou ausente: 400 `Name cannot be empty`. Número: 400 `name must be a string`. Mais de 255 caracteres: aceito e cortado em 255 |
| `status` | string | sim | `publish`, `draft`, `inactive`. Ausente, maiúsculo (`PUBLISH`) ou outro valor: 422 `Invalid status` |
| `price` | number | sim | Ausente ou string: 400. Negativo: 400 `price must not be less than 0`. `0` é aceito. Gravado como float de 32 bits |
| `externalId` | string ou null | não | Número: 400 `externalId must be a string`. `null` é aceito |
| `specification` | `"m"`, `"f"`, `""` ou null | não | Outro texto não vazio ou maiúsculo (`M`): 422 `Invalid specification`. `""` grava vazio (no PUT, é o jeito de limpar). `false` e `0` passam e gravam `"false"` e `"0"`: não envie |
| `categories` | array de string ou null | não | String no lugar do array: 400 `categories must be an array`. Item vazio: 400 `Categories cannot contain empty values`. Item número: 400 `Each category must be a string`. `null` vira `[]`. Grafia diferente (`cat1` e `CAT1`) cria duas categorias na conta |
| `provider` | string ou null | não | Espaço, string vazia ou caractere fora de letras, números, `-` e `_`: 400. Mais de 50 caracteres: 400. Gravado em minúsculas (`Meu-Ecommerce` vira `meu-ecommerce`) |

Campos fora desta tabela são aceitos e descartados (não são gravados nem devolvidos).

### Precisão do preço

| Enviado | Lido de volta no GET |
|---|---|
| `0.01` | `0.01` |
| `19.999` | `19.999` |
| `1999.95` | `1999.95` |
| `9999.99` | `9999.99` |
| `1000.005` | `1000.01` |
| `1234.565` | `1234.56` |
| `12345.65` | `12345.7` |
| `12345.67` | `12345.7` |
| `99999.95` | `100000` |
| `99999.99` | `100000` |
| `1234567.89` | `1234570` |
| `1e39` | `3.40282e+38` |

Regra: o preço é convertido para float de 32 bits e lido com 6 dígitos significativos (em JavaScript,
`Number(Math.fround(price).toPrecision(6))`). Não é o arredondamento escolar: `1234.565` vira `1234.56`
e `1000.005` vira `1000.01`. Acima de 3.4e38 a API responde 200 e grava o teto `3.40282e+38`. A resposta
do POST e do PUT ecoa o valor enviado; só o GET mostra o gravado. O validador da skill avisa quando o
preço vai mudar e dá erro acima do teto.

## Resposta de produto (POST, GET, PUT)

```json
{
  "id": "7822c59b-8a30-4458-9c40-b07e7ac9e2f7",
  "externalId": "SKU-123",
  "name": "Camiseta Polo",
  "status": "publish",
  "specification": "m",
  "price": 89.9,
  "categories": ["vestuario", "masculino"],
  "provider": "meu-ecommerce",
  "createdAt": "2026-10-07T17:43:45.000Z",
  "updatedAt": "2026-10-07T17:43:45.000Z"
}
```

- `id` é o UUID da Zoppy. É o valor que vai em `lineItems[].productId` do pedido.
- No GET, campo sem valor vem `null` (`specification`, `provider`, `externalId`) e `categories` vem `[]`.
- Na resposta do POST e do PUT, campo não enviado pode faltar no JSON (por exemplo `specification`).
- Datas em UTC. Na resposta do POST que cria vêm com milissegundos; no GET e no POST que devolve um
  produto já existente, com segundos inteiros (`.000Z`).
- Na resposta do PUT, `updatedAt` pode trazer o valor anterior à atualização. Leia com GET.

## Listagem: GET /products

| Parâmetro | Obrigatório | Regra |
|---|---|---|
| `after` | sim | Data. Traz produtos criados a partir dela (`2026-10-07` ou `2026-10-07T14:00:00-03:00`). Ausente ou inválida: 422 `Invalid after date` |
| `page` | sim | A partir de 1. Ausente: 422 `Page parameter is required`. `0`: 422 `Page needs to be bigger than 0` |
| `pageSize` | sim | De 1 a 50. `51`: 422 `Page size needs to be less than or equal 50` |
| `updatedAt` | não | Data. Restringe a produtos atualizados a partir dela. Inválida: 422 `Invalid updatedAt date` |

Resposta:

```json
{
  "pagination": { "page": 1, "pageSize": 50, "totalRecords": 3, "totalPages": 1 },
  "data": [ { "id": "...", "name": "...", "price": 50 } ]
}
```

Produtos excluídos não aparecem na listagem.
