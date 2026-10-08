---
description: "cadastrar a equipe de vendas e atribuir cada pedido ao vendedor"
tags: [zoppy-partners-vendedores]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

No meu PDV cada venda tem o vendedor que atendeu. A tabela `vendedores` do PDV tem id, nome, email,
celular no formato "+55 (11) 98765-4321" e matrícula. Quero cadastrar os vendedores na Zoppy pela
Partners API e mandar cada pedido já atribuído ao vendedor certo. A sincronização roda todo dia e não
pode criar vendedor duplicado. Escreva o código Node. Use as variáveis de ambiente da Zoppy. Mostre o código completo na resposta.
