---
description: "marcar pedido como entregue para disparar o fluxo de Entregue"
tags: [zoppy-partners-pedidos]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

Sou um app de delivery. Já mando os pedidos para a Partners API da Zoppy quando eles são confirmados. O
lojista quer um fluxo de automação que dispare quando o pedido é entregue ao cliente. No meu sistema o
pedido passa por confirmado e depois por entregue; pedidos com pagamento na entrega (voucher) ficam
aguardando pagamento até o estabelecimento lançar o pagamento. Escreva a função que avisa a Zoppy que um
pedido foi entregue. Ela recebe o `id` da Zoppy do pedido, o meu payload completo do pedido (itens com
`productId` da Zoppy, subtotal dos itens, frete, desconto, data da compra e data da confirmação) e se ele
já foi pago. Mostre o código completo na resposta.
