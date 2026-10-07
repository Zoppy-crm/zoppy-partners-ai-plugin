---
description: "preço não atualiza e produto duplicado"
tags: [zoppy-partners-produtos]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Mudei o preço do produto "Camiseta Polo" de 89.90 para 99.90 e reenviei o mesmo `POST /products` com o
mesmo `externalId`. A API respondeu 200, mas o preço continua 89.9. Em outro produto, troquei o nome
e reenviei com o mesmo `externalId`, e agora tenho dois produtos. Também tenho um produto de
R$ 12.345,67 que aparece como 12345.7. O que está errado e como corrijo?
