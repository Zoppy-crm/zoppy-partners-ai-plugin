---
description: "registrar cupom individual de recompra"
tags: [zoppy-partners-cupons-webhooks]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Minha loja gera, no nosso sistema, um cupom de R$ 30 para o cliente voltar a comprar, sem valor
mínimo, válido até 31/12/2026 às 23:59 (horário de Brasília). O cliente tem telefone
(11) 98765-4321 e já está na Zoppy. Escreva em Node a função que registra esse cupom na Zoppy
com o código VOLTA30 e o nosso ID cupom-8812. O cupom só pode ser baixado quando o cliente digitar
o código. Também quero uma função que marca o cupom como usado na Zoppy quando ele é resgatado
no nosso PDV.
