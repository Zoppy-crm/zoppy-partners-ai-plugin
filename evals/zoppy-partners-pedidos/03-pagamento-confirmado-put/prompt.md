---
description: "pedido criado aguardando pagamento e depois pago (reenvio por PUT)"
tags: [zoppy-partners-pedidos]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

Meu sistema cria o pedido quando o cliente fecha a compra (aguardando pagamento) e depois avisa quando
o pagamento é aprovado ou quando o pedido é cancelado. Escreva o código de sincronização com a Partners
API da Zoppy que cria o pedido se ele ainda não existir e atualiza se já existir. O pedido tem
`externalId` do meu sistema, cliente `7f3c2a10-5b1e-4c8d-9a6f-2e4b8c1d0a01`, itens com `productId` da Zoppy, subtotal dos
itens, frete e desconto, data da compra e data da aprovação do pagamento. Mostre o código completo na resposta.
