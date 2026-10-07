# Recuperação do carrinho e relação com pedidos

O que está aqui é o contrato observado de fora. Mensagens enviadas ao cliente dependem dos fluxos
de carrinho abandonado configurados na conta Zoppy; a Partners API não devolve nada sobre isso.

## O que coloca o carrinho na recuperação

- Todo `POST /abandoned-carts` e todo `PUT /abandoned-carts/:id` que responde 200 pede que a
  Zoppy reavalie o carrinho para os fluxos de carrinho abandonado da conta. A avaliação é
  assíncrona, depois da resposta.
- Há no máximo uma avaliação por carrinho a cada 60 s. Um `PUT` feito menos de 60 s depois do
  envio anterior do mesmo carrinho não gera nova avaliação; um `PUT` depois disso gera.
- O carrinho gravado por um `POST` que respondeu 500 (ver erros.md) também é avaliado.

## O que barra a recuperação

A Zoppy não inicia a recuperação quando já existe um pedido:

1. com o mesmo telefone do cliente do carrinho, e
2. com `createdAt` depois do `createdAt` do carrinho. Vale a data gravada do pedido (a que você
   mandou no pedido), não a hora em que o pedido foi enviado.

O status do pedido não importa: pedido cancelado também barra. O teste é feito a cada avaliação.
Observado em teste:

| Carrinho | Pedido do mesmo cliente | Resultado |
|---|---|---|
| `createdAt` 2 h antes do pedido, avaliado de novo por `PUT` depois do pedido | criado depois do carrinho | recuperação barrada |
| criado com `createdAt` 1 h antes de um pedido já existente | criado depois do `createdAt` | recuperação barrada já na criação |
| criado sem `createdAt`, depois do pedido | criado antes do carrinho | não barrada |
| `createdAt` 2 h antes, `PUT` 1 s depois de um pedido cancelado | cancelado, criado depois do carrinho | `PUT` dentro de 60 s do `POST`: sem nova avaliação; `PUT` 75 s depois: barrada |
| `createdAt` 1 h antes, depois um pedido enviado agora com `createdAt` 2 h antes, `PUT` 75 s depois | `createdAt` anterior ao do carrinho | não barrada |

Consequências para a integração:

- **Mande o `createdAt` real do abandono.** Sem ele a data do carrinho é o momento do envio.
  Se o cliente comprou entre o abandono e o envio do carrinho, o pedido fica com data anterior à
  do carrinho e não barra a recuperação.
- **Cadastre o pedido também** (skill `zoppy-partners-pedidos`) com o mesmo cliente. É o pedido,
  e não uma mudança no carrinho, que barra a recuperação.

## O carrinho não vira "convertido"

- A resposta do carrinho não tem campo de status ou de conversão.
- Depois que chega um pedido do mesmo cliente, `GET /abandoned-carts/:id` devolve o carrinho igual
  ao que era antes.
- Se o seu sistema precisa saber quais carrinhos converteram, cruze do seu lado (por cliente e
  data).

## Exigências para o carrinho ser aceito

- Cliente existente na conta, informado pelo id Zoppy em `customerId` (veja a skill
  `zoppy-partners-clientes` para o cadastro do cliente).
- `url` não vazia. URL só com espaços é aceita e gravada vazia: o carrinho fica sem link de
  recuperação.
- `subtotal` numérico.
