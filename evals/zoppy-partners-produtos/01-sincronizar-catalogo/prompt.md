---
description: "sincronizar catálogo várias vezes por dia"
tags: [zoppy-partners-produtos]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

Tenho um catálogo exportado do meu ERP como uma lista de objetos
`{ sku, nome, preco, precoPromocional, estoque, categorias, imagem, ativo }`, com `preco` vindo como
string (`"129.90"`). Escreva um script Node 18 que envia esse catálogo para a Zoppy pela Partners API.
O script vai rodar a cada hora, então reenviar o mesmo produto não pode duplicar nem deixar preço
velho. Mostre o código completo na resposta.
