---
description: "carrinho que não entrou na recuperação"
tags: [zoppy-partners-carrinho-abandonado]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Mandamos para a Zoppy os carrinhos abandonados do dia em lote, às 23h, sem `createdAt`. O cliente abandonou às 14h, comprou às 16h, e mesmo assim recebeu a mensagem de recuperação. Em outro caso, um carrinho com `url: " "` nunca teve recuperação. O que está errado na nossa integração e como corrigir?
