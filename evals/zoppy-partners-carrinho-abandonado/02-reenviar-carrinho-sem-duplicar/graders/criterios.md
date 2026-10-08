---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Busca primeiro por `GET {base}/abandoned-carts/external/{cart.id}`; 404 significa criar, 200 significa atualizar.
- Cria com `POST /abandoned-carts` levando `externalId: cart.id`, `customerId`, `createdAt: cart.abandonedAt`.
- Atualiza com `PUT /abandoned-carts/{id}` usando o `id` Zoppy devolvido pela busca, não o `externalId`.
- No PUT manda `url` não vazia (a chave é obrigatória no PUT; vazia apaga o link), `subtotal`, `discount` e `shipping`, e a **lista completa** de `lineItems` (o PUT substitui os itens).
- Trata 500 no PUT como gravação parcial (valores trocados, itens antigos apagados) e refaz o PUT com a lista certa, em vez de assumir que nada mudou.
- `subtotal = productsTotal + shipping` nos dois casos; `discount` e `shipping` sempre presentes (0 quando não houver).
- Não manda `externalId`, `customerId` nem `createdAt` esperando que o PUT os altere.
- Valida o corpo com `--schema=carrinho.create` e `--schema=carrinho.update`.

## Reprova se

- Repetir o POST com outro `externalId` para "contornar" o 422 (duplica carrinhos).
- Mandar no PUT só os itens alterados.
- Omitir `url` no PUT ou mandar `url` vazia.
