---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Primeiro `GET /customers/external/cli-789` para obter o `id` da Zoppy; o `PUT` usa esse `id`, não o externalId.
- `PUT /customers/{id}` com `phone`, `firstName` e `lastName` atuais (lidos do GET) e o `address` novo com `address1`, `city`, `state`, `postcode`, `latitude`, `longitude`.
- Omite `email` e `birthDate` (ou manda `null`), sabendo que assim eles ficam como estão.
- Não manda `gender: ""` nem `email: ""` (apagariam o valor) nem `null` em `address1`, `city`, `state` ou `postcode`.
- Confere com `GET /customers/{id}` depois do `PUT`, sem confiar no `updatedAt` da resposta do `PUT`.
- Avisa que o endereço novo aparece também nos pedidos desse cliente, porque o pedido usa o endereço do cliente.
