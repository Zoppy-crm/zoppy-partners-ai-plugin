---
description: "pedido com frete e desconto, venda e confirmação em dias diferentes"
tags: [zoppy-partners-pedidos]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

Tenho um delivery e quero mandar meus pedidos para a Zoppy pela Partners API. Escreva uma função
em Node que recebe um pedido do meu sistema e envia para a Zoppy. Exemplo: pedido 7003, cliente
já cadastrado na Zoppy (id `7f3c2a10-5b1e-4c8d-9a6f-2e4b8c1d0a01`), dois itens que somam R$ 131,60 (produto `7f3c2a10-5b1e-4c8d-9a6f-2e4b8c1d0a02`,
quantidade 2), frete de R$ 20,00 cobrado do cliente, cupom de desconto de R$ 7,58. A venda foi feita
em 05/09/2026 às 10:26 (horário de Brasília) e o pagamento foi confirmado em 09/09/2026 às 14:00.
O pedido já está pago. Mostre o código completo na resposta.
