---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Aponta o espaço no fim de `"Loja Centro "`: o nome precisa bater com espaços (maiúsculas e acentos não importam), e sem correspondência o pedido vai para a loja padrão "Integrador Externo" sem erro.
- Recomenda mandar `storeId` (o `id` da loja em `GET /stores`), guardado no cadastro da filial, em vez de `store.name`.
- Explica que `storeId` errado responde 422, enquanto `store` sem correspondência erra em silêncio.
- Diz que os pedidos já gravados continuam na loja padrão e indica corrigi-los com `PUT /orders/{id}` completo com o `storeId` certo (ou aponta o procedimento de correção).

## Erros que reprovam

- Sugerir criar uma loja nova chamada "Loja Centro " (com espaço) para casar com o PDV.
- Dizer que a comparação diferencia maiúsculas ou acentos.
