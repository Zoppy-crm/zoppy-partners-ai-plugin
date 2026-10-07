# Eval 03: carrinho que não entrou na recuperação

## Pedido do desenvolvedor

> Mandamos para a Zoppy os carrinhos abandonados do dia em lote, às 23h, sem `createdAt`. O cliente abandonou às 14h, comprou às 16h, e mesmo assim recebeu a mensagem de recuperação. Em outro caso, um carrinho com `url: " "` nunca teve recuperação. O que está errado na nossa integração e como corrigir?

## Critérios de acerto

- Explica que a Zoppy não inicia a recuperação quando há pedido do mesmo telefone do cliente criado **depois** do `createdAt` do carrinho.
- Explica que, sem `createdAt`, a data do carrinho virou 23h (momento do envio), então o pedido das 16h ficou "antes" do carrinho e não barrou a recuperação.
- Corrige mandando `createdAt` com a hora real do abandono e fuso (ex. `2026-10-07T14:00:00-03:00`).
- Recomenda cadastrar o pedido pela API de pedidos para o mesmo cliente, com o `createdAt` real do pedido (o carrinho não vira "convertido" por campo próprio; vale a data gravada do pedido, de qualquer status).
- Explica que `url` só com espaços é aceita e gravada vazia, deixando o carrinho sem link de recuperação; corrige mandando a URL real e validando antes com `scripts/validate.mjs --schema=carrinho.create` (que avisa).
- Diz que o envio de mensagem depende dos fluxos configurados na conta, sem prometer resultado.

## Reprova se

- Afirmar que existe um campo de status ou "convertido" no carrinho para marcar.
- Afirmar que cada `PUT` reavalia o carrinho na hora (há no máximo uma avaliação por carrinho a cada 60 s).
- Afirmar que a Zoppy cruza por e-mail ou por `externalId` do pedido.
- Prometer que a mensagem será enviada ou bloqueada independentemente da configuração da conta.
