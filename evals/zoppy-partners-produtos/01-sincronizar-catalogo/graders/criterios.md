---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

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
7. Lê de volta (`GET /products/{id}`) ao menos em modo de verificação e compara `price` e `categories`.
8. Depois de um POST, compara o `externalId` da resposta com o `sku` enviado: se vier outro, trata como
   colisão de nome (a deduplicação ignora maiúsculas e acentos) e não grava aquele id como se fosse do
   seu produto.
9. Avisa que grafias diferentes da mesma categoria (`Verao` e `VERAO`) viram categorias distintas, ou
   normaliza a grafia no código.
