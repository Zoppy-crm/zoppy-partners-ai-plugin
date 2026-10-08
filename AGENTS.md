# AGENTS.md

Este repositório traz Agent Skills da Partners API da Zoppy em `skills/`.

- Para qualquer tarefa com a Partners API, leia primeiro `skills/zoppy-partners-api/SKILL.md` e depois a skill do recurso.
- Antes de devolver código que monta um payload, rode o validador da skill do recurso
  (`node skills/<skill>/scripts/validate.mjs --schema=<nome> '<json>'`) em todo corpo de `POST` e `PUT` e corrija todo ERRO.
- Token e `zoppy-access` vêm de variáveis de ambiente (`ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS`). Nunca escreva esses valores em código ou arquivo, e nunca os imprima (`env`, `printenv`, `echo`): para conferir se existem, teste só a presença.
- Dado criado em teste leva o prefixo definido pelo usuário e é apagado no fim, inclusive cupons gerados pelas automações da conta. A limpeza apaga pelo identificador guardado na criação, nunca por filtro de nome, código ou prefixo; se a execução quebrou, as sobras se acham pelo `externalId` exato (`GET /<recurso>/external/{externalId}`).
- `rules/zoppy-partners.md` leva essas regras ao Antigravity, que aplica as regras da pasta `rules/` de um plugin instalado. Mude os dois arquivos juntos.
- Cada `SKILL.md` repete a regra de credenciais e a de dados de teste, porque quem copia só `skills/` para `.agents/skills/` não recebe este arquivo nem `rules/`.
- `skills/*/scripts/validate.mjs` é gerado por `npm run build` a partir de `tools/validate.mjs`; não edite a cópia.
- Evals ficam em `evals/<skill>/<caso>/` no formato do `claude plugin eval` (`prompt.md` + `graders/*.md`).
