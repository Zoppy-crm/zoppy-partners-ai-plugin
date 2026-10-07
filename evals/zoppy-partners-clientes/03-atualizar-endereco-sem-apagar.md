# Eval 03: atualizar só o endereço sem perder outros dados

## Pedido do desenvolvedor

> O cliente com externalId "cli-789" mudou de endereço para Rua Nova, 456, Campinas/SP, CEP 13010-000, latitude -22.9, longitude -47.06. Quero atualizar só isso, sem mexer no e-mail e na data de nascimento. Me dá as chamadas.

## Critérios de acerto

- Primeiro `GET /customers/external/cli-789` para obter o `id` da Zoppy; o `PUT` usa esse `id`, não o externalId.
- `PUT /customers/{id}` com `phone`, `firstName` e `lastName` atuais (lidos do GET) e o `address` novo com `address1`, `city`, `state`, `postcode`, `latitude`, `longitude`.
- Omite `email` e `birthDate` (ou manda `null`), sabendo que assim eles ficam como estão.
- Não manda `gender: ""` nem `email: ""` (apagariam o valor) nem `null` em `address1`, `city`, `state` ou `postcode`.
- Confere com `GET /customers/{id}` depois do `PUT`, sem confiar no `updatedAt` da resposta do `PUT`.
- Avisa que o endereço novo aparece também nos pedidos desse cliente, porque o pedido usa o endereço do cliente.
