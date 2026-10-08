---
description: "sincronizar a base de clientes sem duplicar"
tags: [zoppy-partners-clientes]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

Tenho um ERP com a tabela `clientes` (id, nome_completo, celular no formato "(11) 98765-4321", email, nascimento "1990-05-15", sexo "M"/"F", rua, numero, complemento, cidade, uf, cep). Escreva um script Node que envia todos para a Zoppy pela Partners API e pode rodar todo dia sem criar cliente duplicado. Use as variáveis de ambiente da Zoppy. Mostre o código completo na resposta.
