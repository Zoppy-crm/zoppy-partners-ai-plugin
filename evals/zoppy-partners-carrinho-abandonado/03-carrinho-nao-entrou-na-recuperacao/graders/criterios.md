---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Explica que a Zoppy não inicia a recuperação quando há pedido do mesmo telefone do cliente criado **depois** do `createdAt` do carrinho.
- Explica que, sem `createdAt`, a data do carrinho virou 23h (momento do envio), então o pedido das 16h ficou "antes" do carrinho e não barrou a recuperação.
- Corrige mandando `createdAt` com a hora real do abandono e fuso (ex. `2026-10-07T14:00:00-03:00`).
- Recomenda cadastrar o pedido pela API de pedidos para o mesmo cliente, com o `createdAt` real do pedido (o carrinho não vira "convertido" por campo próprio; vale a data gravada do pedido, de qualquer status).
- Explica que `url` só com espaços é aceita e gravada vazia, deixando o carrinho sem link de recuperação; corrige mandando a URL real.
- Diz que o envio de mensagem depende dos fluxos configurados na conta, sem prometer resultado.

## Reprova se

- Afirmar que existe um campo de status ou "convertido" no carrinho para marcar.
- Afirmar que cada `PUT` reavalia o carrinho na hora (há no máximo uma avaliação por carrinho a cada 60 s).
- Afirmar que a Zoppy cruza por e-mail ou por `externalId` do pedido.
- Prometer que a mensagem será enviada ou bloqueada independentemente da configuração da conta.
