---
type: llm
---

Avalie só o uso do validador de payload da skill na resposta final do agente. O agente pode não ter tido
como executar comandos nesta sessão: indicar o comando com o `--schema` certo antes do envio conta como
cumprir, e não ter executado não reprova.

PASS se a resposta cumpre o item abaixo, executando o validador ou indicando o comando certo antes do envio.
FAIL se a resposta não manda validar o payload com o validador da skill, ou indica um `--schema` errado.

- Roda `node scripts/validate.mjs --schema=cliente.create` (ou `cliente.update`) em pelo menos um payload antes de enviar, ou explica como rodar.
