---
description: "reenviar carrinho que mudou, sem duplicar"
tags: [zoppy-partners-carrinho-abandonado]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Meu sistema manda o carrinho abandonado para a Zoppy toda vez que ele muda (cliente adiciona ou tira item). Hoje o segundo envio dá erro 422 "External id already exists". Corrija a função `syncCart(cart)` para criar quando não existe e atualizar quando já existe. O `cart` tem `id`, `customerZoppyId`, `items[{zoppyProductId, qty}]`, `productsTotal`, `shipping`, `discount`, `recoveryUrl` e `abandonedAt` (ISO com fuso).
