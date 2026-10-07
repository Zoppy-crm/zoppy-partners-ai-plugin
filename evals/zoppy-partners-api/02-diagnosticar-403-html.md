# Eval 02: diagnosticar 403 com página HTML

## Pedido do desenvolvedor

> Minha integração com a Partners API da Zoppy começou a falhar. Toda chamada responde 403 e o corpo é um HTML com "Just a moment...". Meu código manda `Authorization: Bearer <token>` e `Content-Type: application/json`. O que está errado e como corrijo?

## Critérios de acerto

- Diz que falta o header `zoppy-access` (ou o valor está errado) e que ele é obrigatório em toda requisição, junto com o `Authorization`.
- Explica que esse 403 vem da camada de borda, antes da API, e por isso o corpo é HTML e não JSON.
- Diferencia de problema de token: token ausente ou inválido dá 401 em JSON (`Authorization header authorization not found` ou `External token not found`).
- Sugere ler a chave de uma variável de ambiente (`ZOPPY_ACCESS`) e pedir o valor à Zoppy, sem escrever a chave no código.
- Sugere tratar 403 sem `JSON.parse` do corpo.

## Reprova se

- Sugerir renovar ou gerar novo token como primeira causa.
- Sugerir trocar `Bearer` por outro esquema ou mandar o token em query string.
