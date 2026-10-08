---
name: zoppy-partners-produtos
description: "Cadastra e mantém produtos na Partners API da Zoppy (POST, GET, PUT e DELETE em /products) e liga o produto ao item do pedido. Use ao gerar código que cria, busca, atualiza, sincroniza ou exclui produto, ao montar lineItems de pedido com productId, ao decidir entre POST e PUT no reenvio, ou ao depurar preço arredondado, categoria sumida, produto duplicado ou item de pedido que não aparece. Gatilhos: cadastrar produto na Zoppy, sincronizar catálogo, atualizar preço, categorias do produto, externalId do produto, productId do item do pedido; em inglês: Zoppy product API, create product, sync catalog, update product price, product categories, order line item productId. Não use para autenticação, base URL e paginação em geral (veja zoppy-partners-api), clientes (zoppy-partners-clientes), valores, datas e status do pedido (zoppy-partners-pedidos), carrinho abandonado (zoppy-partners-carrinho-abandonado) nem cupons e webhooks (zoppy-partners-cupons-webhooks)."
---

# Produtos na Partners API da Zoppy

**Regras fixas desta skill** (valem em toda tarefa, mesmo curta):
1. Antes de entregar código ou de chamar a API, rode você mesmo, no terminal, `node <pasta desta skill>/scripts/validate.mjs --schema=produto.create` (ou `produto.update`) em cada corpo, também os que um script vai montar, e leia cada `ERRO` e `AVISO`. Não deixe essa etapa para o usuário.
2. Em teste, `externalId` e `name` levam o prefixo do usuário inteiro, sem abreviar.
3. Nunca invente dado que o usuário não deu (categoria, `provider`, `specification`): pergunte, ou deixe o campo de fora e avise.
4. Depois de todo `POST` ou `PUT`, releia com `GET /products/{id}` e compare `price` e `categories` com o que mandou.

## Antes de gerar código

1. Autenticação, base URL e formato de erro estão na skill **zoppy-partners-api**. Toda chamada leva
   `Authorization: Bearer <token>` e `zoppy-access: <chave>`, lidos de variáveis de ambiente
   (`ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS`, `ZOPPY_PARTNERS_BASE_URL`). Credenciais: leia essas variáveis só
   dentro do código. Nunca imprima, ecoe ou liste o ambiente (`env`, `printenv`, `echo $ZOPPY_...`) nem cole
   os valores em arquivo, log ou resposta; para conferir se existem, teste só a presença
   (`process.env[k] ? 'definida' : 'AUSENTE'`), sem mostrar o valor.
2. Todo corpo de `POST` e `PUT` de produto passa pelo validador antes de ser enviado ou de entrar no código
   que você devolve, mesmo o mais simples:
   ```bash
   node scripts/validate.mjs --schema=produto.create '<json>'   # POST /products
   node scripts/validate.mjs --schema=produto.update '<json>'   # PUT /products/{id}
   ```
   Execute o validador, sem precisar ler o código dele (Node 18 ou mais novo, sem dependências).
   `scripts/validate.mjs` fica na pasta desta skill (a pasta deste SKILL.md), não no projeto em que você
   trabalha: rode o comando de dentro dela ou troque `scripts/` pelo caminho completo (no Claude Code,
   `${CLAUDE_SKILL_DIR}/scripts/validate.mjs`). Saída `0` sem `ERRO` (pode ter `AVISO`), `1` com `ERRO`, `2`
   uso incorreto. `--file=<caminho>` lê o payload de um arquivo, `--json` devolve o resultado para máquina e
   `--help` mostra o uso. `AVISO` não bloqueia, mas descreve um efeito que você provavelmente não quer.
3. Guarde o `id` que a Zoppy devolve. É ele, e não o seu `externalId`, que vai no `productId` do pedido.
4. Dado criado em teste ou só para ver a resposta leva o prefixo definido pelo usuário e é apagado no fim
   (regra em `zoppy-partners-api`).

## Endpoints

| Método e rota | Faz | Sucesso | Erros comuns |
|---|---|---|---|
| `POST /products` | Cria. Se já existe produto com o mesmo `name` (e `provider`), devolve o existente (veja a regra 2) | 200, produto | 400, 422 |
| `GET /products/{id}` | Busca pelo id da Zoppy (UUID) | 200, produto | 404 |
| `GET /products/external/{externalId}` | Busca pelo seu id | 200, produto | 404 |
| `GET /products/name/{name}` | Busca pelo nome (sem diferenciar maiúsculas nem acentos) | 200, produto | 404 |
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
| `price` | number | sim | Número JSON maior ou igual a 0. String (`"89.90"`): 400. Gravado como float de 32 bits (veja a regra 4) |
| `externalId` | string ou null | não | Seu id. Não deduplica |
| `specification` | string ou null | não | Mande `m` ou `f` (minúsculas) ou omita. Outro texto não vazio, inclusive `M`: 422 `Invalid specification`. `""`, `false` e `0` passam sem erro (veja a regra 3) |
| `categories` | string[] | não | Nomes de categoria, sem item vazio. Use sempre a mesma grafia: `verao` e `VERAO` viram duas categorias |
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
resposta do pedido que `lineItems` tem a quantidade de itens que você mandou.

Na leitura do pedido (`GET /orders/{id}`), identifique o item por `lineItems[].productId`. O objeto
`lineItems[].product` é montado na hora da leitura e casa o produto pelo id **ou** pelo `externalId`:
se dois produtos do pedido estão sem `externalId`, ou têm o mesmo `externalId`, um item pode mostrar o
produto do outro. Por isso, mande `externalId` único em todo produto. Com `externalId` único,
`lineItems[].product.price` é o preço **atual** do produto (não o da venda) e, se o produto for
excluído depois, o item deixa de aparecer na leitura. Detalhes em
[references/vinculo-com-pedido.md](references/vinculo-com-pedido.md).

### 2. POST deduplica por `name`, não por `externalId`

- Mesmo `name` (sem diferenciar maiúsculas nem acentos: `Pão` e `PAO` são o mesmo) e mesmo
  `provider`, ou mesmo `name` sem `provider` no corpo: o POST devolve o produto que já existe, com o id
  e o `externalId` dele, e **ignora** `price`, `status`, `specification` e `externalId` enviados.
- Nesse reenvio, as categorias que a Zoppy usa internamente são trocadas pela lista enviada (reenvio
  sem `categories` apaga todas), mas o `categories` devolvido no POST e no GET continua o antigo. Reenvie
  sempre com a lista completa, ou use PUT, que atualiza as duas coisas.
- Mesmo `externalId` com `name` diferente: cria **outro** produto.
- Mesmo `name` com `provider` diferente: cria outro produto com o mesmo nome. Enquanto os dois
  existirem, o `PUT` que mantém esse nome falha com 422 `Product name is already being used`, e
  `GET /products/name/{name}` (assim como o POST sem `provider`) devolve só um deles.
- `name` com espaço sobrando no início ou no fim, ou com mais de 255 caracteres, não casa com o já
  gravado e gera duplicata.

Reenvio seguro (upsert):

```text
GET /products/external/{externalId}
  404 -> POST /products
         se o externalId da resposta for diferente do seu, o nome colidiu com outro produto:
         não guarde esse id; torne o nome único (ou atualize aquele produto com PUT, se for o mesmo item)
  200 -> PUT  /products/{id da resposta} com o corpo completo
depois do POST ou do PUT -> GET /products/{id}
         compare price (o valor que o validador diz que será gravado) e categories com o enviado;
         se categories divergir, reenvie com PUT
```

A resposta do POST e do PUT ecoa o preço que você mandou; só o `GET` mostra o preço gravado (regra 4).
No PUT, campo omitido também some da resposta (regra 3).

### 3. PUT substitui: mande o corpo completo

- `name`, `status` e `price` são obrigatórios também no PUT.
- `categories` substitui a lista inteira. PUT sem `categories` (ou com `null` ou `[]`) deixa o produto
  sem categorias.
- `externalId` ausente mantém o valor gravado; `null` apaga. `provider` ausente ou `null` mantém o
  valor gravado (não dá para limpá-lo pelo PUT).
- `specification` ausente ou `null` mantém o valor gravado. Para limpar, mande `""` (grava vazio).
  Não mande `false` nem `0`: passam sem erro e gravam o texto `"false"` ou `"0"`.
- A resposta do PUT ecoa o corpo enviado: campo omitido some da resposta e `updatedAt` pode vir com o
  valor anterior. Para conferir o que ficou gravado, faça `GET /products/{id}`.

### 4. Preço é número e tem precisão limitada

```jsonc
"price": "89.90"    // ERRADO: 400 "price must be a number conforming to the specified constraints"
"price": 89.9       // CERTO
```

O preço é convertido para float de 32 bits e lido com 6 dígitos significativos: `9999.99` e `1999.95`
voltam iguais, mas `12345.65` e `12345.67` voltam `12345.7`, `99999.99` volta `100000` e `1234.565` volta
`1234.56`. O arredondamento não é o escolar; o validador da skill calcula o valor que será gravado.
Acima de 3.4e38 a API responde 200 e grava `3.40282e+38`. A resposta do POST ecoa o valor enviado; o
GET mostra o gravado.

### 5. Excluir

`DELETE /products/{id}` tira o produto de todas as buscas e da listagem (404 depois). Um novo POST com o
mesmo `name` cria um produto novo, com outro id.

## Como validar o que foi gravado

Depois de cada escrita, leia de volta com `GET /products/{id}` e compare `name`, `status`, `price`,
`categories`, `externalId`. Datas na leitura vêm em UTC com segundos inteiros (`.000Z`).

## Exemplos prontos (rodam contra a sua conta)

Use os exemplos como modelo de código: leia o arquivo e adapte ao projeto. Só execute um exemplo se
o usuário pedir, com as três variáveis de ambiente de uma conta de teste e a partir da pasta desta
skill (os caminhos abaixo são relativos a ela).

- [assets/examples/01-criar-buscar-atualizar-excluir.mjs](assets/examples/01-criar-buscar-atualizar-excluir.mjs)
  cria, lê pelas três buscas, reenvia o POST, atualiza com PUT e exclui. A versão `.curl.sh` faz o
  ciclo curto: cria, lê por id e por `externalId`, atualiza, exclui.
- [assets/examples/02-produto-no-pedido.mjs](assets/examples/02-produto-no-pedido.mjs): cria cliente e
  produto, manda pedido com um item pelo id da Zoppy e outro pelo `externalId`, confere que só o
  primeiro é gravado, exclui o produto e confere que o item some. A versão `.curl.sh` vai até a
  conferência dos itens gravados.

Todos usam `externalId` e nome com prefixo `skills-test-` e apagam o que criaram.
