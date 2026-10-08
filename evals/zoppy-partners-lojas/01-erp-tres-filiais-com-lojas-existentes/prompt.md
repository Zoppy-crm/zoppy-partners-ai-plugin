---
description: "ERP de lojas físicas com 3 filiais, numa conta que já tem lojas de outra integração"
tags: [zoppy-partners-lojas]
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

Sou o integrador de um ERP de lojas físicas. O cliente tem 3 filiais no ERP: código `01` FÁBRICA,
código `05` LOJA SÃO PAULO e código `06` LOJA BELO HORIZONTE. Vou mandar os pedidos de venda para a
Zoppy pela Partners API e cada pedido tem que cair na filial certa. Rodei `GET /stores` na conta e veio
isto (já existia antes de mim, de outro sistema que a loja usa):

```json
{"pagination":{"page":1,"pageSize":50,"totalRecords":4,"totalPages":1},"data":[
 {"id":"2e7a1c7b-5ae8-4eb4-87f7-8a3705eac4b7","externalId":"7e90dbf4-5a72-4d10-8707-e316919a8cd4","name":"Integrador Externo","isEcommerce":false},
 {"id":"6b1f0c2e-1d1a-4c55-9f0e-2a7d3c9b8e01","externalId":"001","name":"FABR","isEcommerce":false},
 {"id":"9a3e5d7c-2b4f-4e6a-8c1d-3f5e7a9b0c12","externalId":"004","name":"LJ BH ","isEcommerce":false},
 {"id":"c4d2e6f8-3a5b-4c7d-9e1f-4a6b8c0d2e23","externalId":"105","name":"LJ PINHEIROS","isEcommerce":false}
]}
```

Escreva o código Node que cadastra as filiais na Zoppy e manda os pedidos com a loja certa. Use as
variáveis de ambiente da Zoppy.
