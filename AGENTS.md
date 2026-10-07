# AGENTS.md

Este repositório traz Agent Skills da Partners API da Zoppy em `skills/`.

- Para qualquer tarefa com a Partners API, leia primeiro `skills/zoppy-partners-api/SKILL.md` e depois a skill do recurso.
- Antes de devolver código que monta um payload, rode o validador da skill do recurso
  (`node skills/<skill>/scripts/validate.mjs --schema=<nome> '<json>'`) e corrija todo ERRO.
- Token e `zoppy-access` vêm de variáveis de ambiente (`ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS`). Nunca escreva esses valores em código ou arquivo.
- `skills/*/scripts/validate.mjs` é gerado por `npm run build` a partir de `tools/validate.mjs`; não edite a cópia.
