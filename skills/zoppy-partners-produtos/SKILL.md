---
name: zoppy-partners-produtos
description: Cadastra e mantém produtos na Partners API da Zoppy (POST, GET, PUT e DELETE em /products) e liga o produto ao item do pedido. Use ao gerar código que cria, busca, atualiza, sincroniza ou exclui produto, ao montar lineItems de pedido com productId, ao decidir entre POST e PUT no reenvio, ou ao depurar preço arredondado, categoria sumida, produto duplicado ou item de pedido que não aparece. Gatilhos PT, cadastrar produto na Zoppy, sincronizar catálogo, atualizar preço, categorias do produto, externalId do produto, productId do item do pedido. Gatilhos EN, Zoppy product API, create product, sync catalog, update product price, product categories, order line item productId. Não use para autenticação, base URL e paginação em geral (veja zoppy-partners-api), clientes (zoppy-partners-clientes), valores, datas e status do pedido (zoppy-partners-pedidos), carrinho abandonado (zoppy-partners-carrinho-abandonado) nem cupons e webhooks (zoppy-partners-cupons-webhooks).
---

# Produtos na Partners API da Zoppy

## Antes de gerar código

1. Autenticação, base URL e formato de erro estão na skill **zoppy-partners-api**. Toda chamada leva
   `Authorization: Bearer <token>` e `zoppy-access: <chave>`, lidos de variáveis de ambiente
   (`ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS`, `ZOPPY_PARTNERS_BASE_URL`). Nunca escreva o token no código.
2. Valide cada corpo antes de enviar:
   ```bash
   node scripts/validate.mjs --schema=produto.create '<json>'   # POST /products
   node scripts/validate.mjs --schema=produto.update '<json>'   # PUT /products/{id}
   ```
   Exit `0` válido, `1` inválido, `2` uso errado. `AVISO` não bloqueia, mas descreve um efeito que você
   provavelmente não quer.
3. Guarde o `id` que a Zoppy devolve. É ele, e não o seu `externalId`, que vai no `productId` do pedido.

## Endpoints

| Método e rota | Faz | Sucesso | Erros comuns |
|---|---|---|---|
| `POST /products` | Cria. Se já existe produto com o mesmo `name` (e `provider`), devolve o existente sem alterar | 200, produto | 400, 422 |
| `GET /products/{id}` | Busca pelo id da Zoppy (UUID) | 200, produto | 404 |
| `GET /products/external/{externalId}` | Busca pelo seu id | 200, produto | 404 |
| `GET /products/name/{name}` | Busca pelo nome (sem diferenciar maiúsculas) | 200, produto | 404 |
| `GET /products?after=&page=&pageSize=&updatedAt=` | Lista paginada, criados a partir de `after` | 200, `{pagination, data}` | 422 |
| `PUT /products/{id}` | Atualiza com o corpo completo (veja a regra 3) | 200, produto | 400, 404, 422 |
| `DELETE /products/{id}` | Exclui | 200, `{"result":true}` | 404 |

`POST` responde **200**, não 201. Detalhes de cada campo, da resposta e da listagem em
[references/campos-e-respostas.md](references/campos-e-respostas.md); todos os erros com o corpo real em
[references/erros.md](references/erros.md).

## Campos do corpo (POST e PUT)

| Campo | Tipo | Obrigatório | Regra real |
|---|---|---|---|
| `name` | string | sim | Não vazio. Gravado com até 255 caracteres (o resto é cortado). É a chave de deduplicação do POST |
| `status` | string | sim | `publish`, `draft` ou `inactive`, em minúsculas. Ausente ou outro valor: 422 `Invalid status` |
| `price` | number | sim | Número JSON maior ou igual a 0. String (`"89.90"`): 400. Gravado com 6 dígitos significativos |
| `externalId` | string ou null | não | Seu id. Não deduplica |
| `specification` | string ou null | não | `m` ou `f`, em minúsculas. Outro valor: 422 `Invalid specification` |
| `categories` | string[] | não | Nomes de categoria, sem item vazio |
| `provider` | string | não | Letras, números, `-` e `_`, até 50 caracteres. Gravado em minúsculas |

**A API de produtos não tem** SKU, estoque, preço promocional, imagem, URL, variações nem produto pai.
Campos com esses nomes (`sku`, `stock`, `promotionalPrice`, `salePrice`, `imageUrl`, `images`, `url`,
`variations`, `parentId`) são aceitos no corpo (200) e descartados: não são gravados nem devolvidos.
Para referenciar uma variação no pedido, cadastre-a como produto próprio, com `name` distinto (o POST
deduplica por nome).

## Regras que mais causam erro

### 1. `productId` do item do pedido é o id da Zoppy

```jsonc
// ERRADO: externalId no productId. A API responde 200 e descarta o item sem avisar.
"lineItems": [{ "productId": "SKU-123", "quantity": 1 }]
// CERTO: o "id" devolvido pelo POST /products ou pelo GET /products/external/SKU-123
"lineItems": [{ "productId": "7822c59b-8a30-4458-9c40-b07e7ac9e2f7", "quantity": 1 }]
```

Item com `productId` de produto inexistente ou excluído também é descartado com 200. Confira na
resposta do pedido que `lineItems` tem a quantidade de itens que você mandou. Na leitura do pedido,
`lineItems[].product.price` é o preço **atual** do produto, não o preço da venda. Se o produto for
excluído depois, o item deixa de aparecer na leitura do pedido. Detalhes em
[references/vinculo-com-pedido.md](references/vinculo-com-pedido.md).

### 2. POST deduplica por `name`, não por `externalId`

- Mesmo `name` (sem diferenciar maiúsculas) e mesmo `provider`, ou mesmo `name` sem `provider` no corpo:
  o POST devolve o produto que já existe, com o id dele, e **ignora** `price`, `status`,
  `specification` e `externalId` enviados. O `categories` devolvido no POST e no GET continua o antigo.
  Para mudar qualquer um deles, use PUT.
- Mesmo `externalId` com `name` diferente: cria **outro** produto.
- Mesmo `name` com `provider` diferente: cria outro produto com o mesmo nome. Enquanto os dois
  existirem, o `PUT` que mantém esse nome falha com 422 `Product name is already being used`.
- `name` com espaço sobrando no início ou no fim, ou com mais de 255 caracteres, não casa com o já
  gravado e gera duplicata.

Reenvio seguro (upsert):

```text
GET /products/external/{externalId}
  404 -> POST /products
  200 -> PUT  /products/{id da resposta} com o corpo completo
```

### 3. PUT substitui: mande o corpo completo

- `name`, `status` e `price` são obrigatórios também no PUT.
- `categories` substitui a lista inteira. PUT sem `categories` (ou com `null` ou `[]`) deixa o produto
  sem categorias.
- `externalId` ausente mantém o valor gravado; `null` apaga. `specification` e `provider` ausentes ou
  `null` mantêm o valor gravado (não dá para limpá-los pelo PUT).
- A resposta do PUT ecoa o corpo enviado: campo omitido some da resposta e `updatedAt` pode vir com o
  valor anterior. Para conferir o que ficou gravado, faça `GET /products/{id}`.

### 4. Preço é número e tem precisão limitada

```jsonc
"price": "89.90"    // ERRADO: 400 "price must be a number conforming to the specified constraints"
"price": 89.9       // CERTO
```

O preço é gravado com 6 dígitos significativos: `9999.99` e `1999.95` voltam iguais, mas `12345.67` volta
`12345.7` e `99999.99` volta `100000`. A resposta do POST ecoa o valor enviado; o GET mostra o gravado.

### 5. Excluir

`DELETE /products/{id}` tira o produto de todas as buscas e da listagem (404 depois). Um novo POST com o
mesmo `name` cria um produto novo, com outro id.

## Como validar o que foi gravado

Depois de cada escrita, leia de volta com `GET /products/{id}` e compare `name`, `status`, `price`,
`categories`, `externalId`. Datas na leitura vêm em UTC com segundos inteiros (`.000Z`).

## Exemplos prontos (rodam contra a sua conta)

- [assets/examples/01-criar-buscar-atualizar-excluir.mjs](assets/examples/01-criar-buscar-atualizar-excluir.mjs)
  cria, lê pelas três buscas, reenvia o POST, atualiza com PUT e exclui. A versão `.curl.sh` faz o
  ciclo curto: cria, lê por id e por `externalId`, atualiza, exclui.
- [assets/examples/02-produto-no-pedido.mjs](assets/examples/02-produto-no-pedido.mjs): cria cliente e
  produto, manda pedido com um item pelo id da Zoppy e outro pelo `externalId`, confere que só o
  primeiro é gravado, exclui o produto e confere que o item some. A versão `.curl.sh` vai até a
  conferência dos itens gravados.

Todos usam `externalId` e nome com prefixo `skills-test-` e apagam o que criaram.
