---
description: "pedido mandado com seller.phone fica sem vendedor"
tags: [zoppy-partners-vendedores]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Cadastrei a vendedora Maria na Zoppy com `POST /users` e telefone `"+55 (11) 98765-4321"`, e mando os
pedidos com `"seller": { "phone": "11987654321" }`. A API responde 200, mas o pedido volta com
`userId: null`. Já tentei mandar o telefone igualzinho ao cadastro, com `+55` e máscara, e também não
pega. O que está errado e como eu resolvo para os próximos pedidos e para os que já foram?
