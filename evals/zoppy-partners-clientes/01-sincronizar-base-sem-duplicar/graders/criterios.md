---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente; nenhum segredo no código.
- Manda `Authorization: Bearer <token>` e `zoppy-access: <chave>` em toda chamada.
- Faz upsert: `GET /customers/external/{id do ERP}`; 200 leva a `PUT /customers/{id da Zoppy}`; 422 leva a `POST /customers`.
- Depois do `POST`, compara o `externalId` **e o endereço** da resposta com os enviados e, se algum for diferente, faz `PUT` no `id` devolvido (telefone já cadastrado ou endereço herdado de cadastro excluído).
- Avisa que, ao ligar o cadastro existente, o `externalId` antigo deixa de ser encontrado (dois registros do ERP com o mesmo celular trocam o vínculo a cada sincronização).
- Nunca manda texto vazio para "limpar" campo sem querer (`email: ""` apaga o e-mail no `PUT`).
- Separa `nome_completo` em `firstName` (primeira palavra) e `lastName` (resto), os dois como texto.
- Manda `phone` como texto; pode mandar com máscara.
- Manda `address` com `address1` (rua e número), `address2`, `city`, `state`, `postcode` como texto.
- Manda `birthDate` como `YYYY-MM-DD` e `gender` como `m`/`f`.
- Não trata 404 como "não encontrado" na busca por externalId (a API responde 422).
