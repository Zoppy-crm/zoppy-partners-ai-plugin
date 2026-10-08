---
description: "pedido apontando a loja pelo nome cai no Integrador Externo"
tags: [zoppy-partners-lojas]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Meu PDV manda os pedidos para a Zoppy com `"store": { "name": "Loja Centro " }` (o nome vem do cadastro
do PDV, do jeito que está lá). A loja "Loja Centro" existe na Zoppy, eu vi no `GET /stores`. Mesmo assim
os pedidos aparecem na loja "Integrador Externo" e a API responde 200, sem erro. Por quê, como eu
arrumo o envio e o que faço com os pedidos que já foram?
