---
description: "frete grátis, cupom que zera os itens e pedido sem desconto"
tags: [zoppy-partners-pedidos]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Preciso mapear três pedidos do meu e-commerce para a Partners API da Zoppy (cliente `7f3c2a10-5b1e-4c8d-9a6f-2e4b8c1d0a01`,
todos pagos, vendidos em 2026-10-01 às 15:00 de Brasília):
A) itens R$ 50,00, cupom `CORTESIA` que deu 100% de desconto nos itens, e o frete de R$ 10,00 foi
   zerado pelo mesmo cupom (o cliente não pagou nada);
B) itens R$ 100,00, frete grátis, desconto de R$ 10,00;
C) itens R$ 80,00, frete R$ 12,00, sem desconto.
Monte os três payloads de POST /orders.
