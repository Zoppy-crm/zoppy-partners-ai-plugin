# Eval 01: sincronizar catálogo várias vezes por dia

## Pedido do desenvolvedor

> Tenho um catálogo exportado do meu ERP como uma lista de objetos
> `{ sku, nome, preco, precoPromocional, estoque, categorias, imagem, ativo }`, com `preco` vindo como
> string (`"129.90"`). Escreva um script Node 18 que envia esse catálogo para a Zoppy pela Partners API.
> O script vai rodar a cada hora, então reenviar o mesmo produto não pode duplicar nem deixar preço
> velho.

## Critérios de acerto

1. Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente e manda os dois
   cabeçalhos (`Authorization: Bearer ...` e `zoppy-access`). Nenhum segredo no código.
2. Faz upsert: `GET /products/external/{sku}`; em 404 chama `POST /products`; em 200 chama
   `PUT /products/{id}` com o `id` devolvido. Não confia no reenvio do POST para atualizar.
3. Converte `preco` para número (`Number("129.90")`) antes de enviar; nunca manda string.
4. Mapeia `sku` para `externalId`, `nome` para `name` e `ativo` para `status` (`publish` ou `inactive`,
   em minúsculas).
5. Não envia `precoPromocional`, `estoque` nem `imagem` como se fossem gravados, ou diz explicitamente
   que a API de produtos não guarda esses dados.
6. No PUT manda o corpo completo, incluindo `categories` (sem isso o produto perde as categorias).
7. Roda `node scripts/validate.mjs --schema=produto.create` / `produto.update` no payload, ou descreve
   esse passo antes do envio.
8. Lê de volta (`GET /products/{id}`) ao menos em modo de verificação e compara `price` e `categories`.
