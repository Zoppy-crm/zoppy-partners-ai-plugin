# Eval 02: itens do pedido com o código do ERP

## Pedido do desenvolvedor

> Já cadastro os produtos na Zoppy com `externalId` igual ao código do meu ERP. Agora preciso enviar um
> pedido com dois itens: 2 unidades do `CAM-001` e 1 unidade do `CAN-010`. O cliente já existe na Zoppy
> com id `54ebb2b5-b317-4865-9d0c-a02895006da0`. Monte o `lineItems` e a chamada.

## Critérios de acerto

1. Não coloca `CAM-001` nem `CAN-010` direto em `productId`.
2. Resolve cada código com `GET /products/external/{codigo}` e usa o `id` (UUID) devolvido em
   `lineItems[].productId`, com `quantity` 2 e 1.
3. Trata 404 da busca do produto como erro (ou cria o produto antes), sem mandar o item mesmo assim.
4. Depois do `POST /orders`, confere que a resposta tem 2 itens em `lineItems` e trata diferença como
   falha, explicando que a API descarta item com `productId` desconhecido sem devolver erro.
5. Sugere guardar o mapa código -> id da Zoppy para não buscar a cada pedido.
6. Para valores, datas e status do pedido, remete à skill zoppy-partners-pedidos em vez de inventar
   regra.
