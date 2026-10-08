---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

1. Não coloca `CAM-001` nem `CAN-010` direto em `productId`.
2. Resolve cada código com `GET /products/external/{codigo}` e usa o `id` (UUID) devolvido em
   `lineItems[].productId`, com `quantity` 2 e 1.
3. Trata 404 da busca do produto como erro (ou cria o produto antes), sem mandar o item mesmo assim.
4. Depois do `POST /orders`, confere que a resposta tem 2 itens em `lineItems` e trata diferença como
   falha, explicando que a API descarta item com `productId` desconhecido sem devolver erro.
5. Sugere guardar o mapa código -> id da Zoppy para não buscar a cada pedido.
6. Valores, datas e status do pedido seguem as regras da Partners API (ou o validador de pedidos),
   sem regra inventada.
7. Se ler o pedido de volta ou conferir os itens, identifica cada item por `lineItems[].productId` e
   não por `lineItems[].product.id`. Se a resposta não mostra leitura nem conferência por item,
   este item conta como cumprido.
