---
description: "enviar carrinho abandonado com frete e desconto"
tags: [zoppy-partners-carrinho-abandonado]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Minha loja tem um checkout abandonado: cliente com id Zoppy `0e558662-8790-4eb1-9e72-38ad9c8ddba2`, 2 unidades do produto de id Zoppy `0d90ef24-2eff-42fa-8732-8cba125b9b8e` (R$ 50 cada), frete R$ 20, cupom de R$ 10 de desconto, link de recuperação `https://minhaloja.com.br/checkout/abc123`, abandonado em 05/09/2026 às 10:26 (horário de Brasília), id no meu sistema `chk-abc123`. Escreva o código Node que manda esse carrinho para a Zoppy e confere que ele foi gravado certo.
