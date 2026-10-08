---
description: "corrigir pedidos antigos que caíram na loja padrão Integrador Externo"
tags: [zoppy-partners-lojas]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---

Até ontem minha integração mandava os pedidos para a Zoppy sem informar a loja, e todos apareceram
como "Integrador Externo". Já corrigi o envio: agora mando o `storeId` de cada filial (tenho o mapa
filial → storeId). Mas o cliente quer os pedidos de setembro e outubro nas filiais certas. No meu
sistema eu sei a filial de cada pedido pelo número do pedido (que é o `externalId` que mandei). Os
pedidos têm cupom do meu sistema, vendedor e frete. Como corrijo os antigos sem estragar nada? Escreva
o script Node. Mostre o código completo na resposta.
