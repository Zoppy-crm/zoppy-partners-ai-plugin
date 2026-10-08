---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Ordem: lojas e vendedores, depois clientes, depois produtos, depois pedidos, depois carrinhos.
- Explica que pedido e carrinho usam `customerId` e `productId` com o `id` devolvido pela Zoppy, não o `externalId` do sistema; por isso guarda o mapa externalId para id.
- Avisa que item com `productId` inexistente é descartado sem erro e que pedido com loja não encontrada por `store` cai na loja padrão `Integrador Externo`.
- Reenvio de pedido ou carrinho com o mesmo `externalId` dá 422 `External id already exists`; trata como "já foi" buscando por `GET /orders/external/{externalId}` ou `GET /abandoned-carts/external/{externalId}`.
- Avisa que cliente é deduplicado por telefone e produto por nome (mais `provider`, quando enviado), não por `externalId`.
- Manda sempre `externalId` em loja, pedido e carrinho (sem ele, cada reenvio cria um registro novo).
- Manda datas com fuso.

## Reprova se

- Mandar pedido antes de cliente e produto.
- Usar o `externalId` do sistema como `customerId` ou `productId`.
- Tratar 422 de `externalId` repetido como falha definitiva que derruba a fila.
