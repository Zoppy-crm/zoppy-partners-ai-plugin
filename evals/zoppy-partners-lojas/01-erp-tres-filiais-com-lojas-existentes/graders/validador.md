---
type: llm
---

Avalie só o uso do validador de payload da skill na resposta final do agente. O agente pode não ter tido
como executar comandos nesta sessão: indicar o comando com o `--schema` certo antes do envio conta como
cumprir, e não ter executado não reprova.

PASS se a resposta cumpre o item abaixo, executando o validador ou indicando o comando certo antes do envio.
FAIL se a resposta não manda validar o payload com o validador da skill, ou indica um `--schema` errado.

- Roda (ou manda rodar) `node scripts/validate.mjs --schema=loja.create` no corpo do `POST /stores`, ou `--schema=pedido.create` (da skill zoppy-partners-pedidos) no corpo do pedido, antes de enviar.
