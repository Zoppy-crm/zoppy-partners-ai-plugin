# Eval 01: listar todos os clientes criados desde uma data

## Pedido do desenvolvedor

> Escreva um script Node que busca na Zoppy, pela Partners API, todos os clientes cadastrados desde 01/09/2026 e grava num arquivo JSON. Use as variáveis de ambiente da Zoppy.

## Critérios de acerto

- Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente e falha dizendo qual variável falta; nenhum segredo no código.
- Manda `Authorization: Bearer <token>` e `zoppy-access: <chave>` em toda chamada.
- Chama `GET {base}/customers` direto na raiz, sem `/api` nem versão.
- Manda `after` com data, hora e fuso (ex. `2026-09-01T00:00:00-03:00`), não `01/09/2026` (seria lido como 9 de janeiro).
- Manda `page` começando em 1 e `pageSize` entre 1 e 50.
- Lê a resposta como `{ pagination: { page, pageSize, totalRecords, totalPages }, data: [...] }` e para quando `page >= totalPages` (inclusive com `totalPages` 0).
- Junta os clientes por `id` sem duplicar.
- Trata 403 sem `JSON.parse` do corpo (página HTML) e indica conferir o `zoppy-access`.

## Reprova se

- Omitir `after`, `page` ou `pageSize` (a API responde 422).
- Usar `pageSize` maior que 50.
- Esperar que a resposta seja uma lista simples em vez de `{ pagination, data }`.
