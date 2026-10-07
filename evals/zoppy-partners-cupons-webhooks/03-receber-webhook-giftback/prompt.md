---
description: "receber o webhook de giftback"
tags: [zoppy-partners-cupons-webhooks]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

A Zoppy gera giftback para os nossos clientes depois do pedido pago. Quero receber esse cupom no
nosso PDV automaticamente. Monte o cadastro do webhook (nosso endpoint é
https://pdv.exemplo.com.br/zoppy/cupons, protegido por token) e o handler Express que recebe a
chamada e cria o cupom no PDV com a função `criarCupomPdv({codigo, valor, tipo, minimo, validade,
acumula})`, que devolve o ID do PDV.
