# Eval 03: plano de carga inicial e reenvio seguro

## Pedido do desenvolvedor

> Vou migrar para a Zoppy as lojas, vendedores, clientes, produtos, pedidos e carrinhos abandonados do meu sistema. A carga roda numa fila que pode reenviar a mesma mensagem. Em que ordem envio e como evito duplicar ou travar a fila?

## Critérios de acerto

- Ordem: lojas e vendedores, depois clientes, depois produtos, depois pedidos, depois carrinhos.
- Explica que pedido e carrinho usam `customerId` e `productId` com o `id` devolvido pela Zoppy, não o `externalId` do sistema; por isso guarda o mapa externalId para id.
- Avisa que item com `productId` inexistente é descartado sem erro e que pedido com loja não encontrada por `store` cai na loja padrão `Integrador Externo`.
- Reenvio de pedido ou carrinho com o mesmo `externalId` dá 422 `External id already exists`; trata como "já foi" buscando por `GET /orders/external/{externalId}` ou `GET /abandoned-carts/external/{externalId}`.
- Avisa que cliente é deduplicado por telefone e produto por nome, não por `externalId`, e aponta as skills zoppy-partners-clientes e zoppy-partners-produtos para o detalhe.
- Manda datas com fuso.

## Reprova se

- Mandar pedido antes de cliente e produto.
- Usar o `externalId` do sistema como `customerId` ou `productId`.
- Tratar 422 de `externalId` repetido como falha definitiva que derruba a fila.
