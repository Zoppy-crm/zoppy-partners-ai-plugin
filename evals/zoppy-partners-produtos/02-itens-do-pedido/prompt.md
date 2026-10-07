---
description: "itens do pedido com o código do ERP"
tags: [zoppy-partners-produtos]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Já cadastro os produtos na Zoppy com `externalId` igual ao código do meu ERP. Agora preciso enviar um
pedido com dois itens: 2 unidades do `CAM-001` e 1 unidade do `CAN-010`. O cliente já existe na Zoppy
com id `54ebb2b5-b317-4865-9d0c-a02895006da0`. Monte o `lineItems` e a chamada.
