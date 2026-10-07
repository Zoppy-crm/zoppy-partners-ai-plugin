---
trigger: always_on
description: Regras gerais para qualquer tarefa com a Partners API da Zoppy (credenciais, validador, dados de teste).
---

# Partners API da Zoppy: regras gerais

Valem quando a tarefa envolve a Partners API da Zoppy.

- Leia primeiro a skill `zoppy-partners-api` e depois a skill do recurso (clientes, produtos,
  pedidos, carrinho abandonado, cupons e webhooks).
- Antes de enviar ou de devolver código que monta um payload, rode o validador da skill do recurso
  (`scripts/validate.mjs --schema=<nome>`) em todo corpo de `POST` e `PUT`, de todos os recursos, e
  corrija todo ERRO.
- Credenciais: leia `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` só dentro do
  código. Nunca imprima, ecoe ou liste o ambiente (`env`, `printenv`, `set`, `echo $ZOPPY_...`) e
  nunca cole os valores em código, arquivo, log ou resposta. Para conferir se existem, teste só a
  presença, sem mostrar o valor.
- Todo dado criado em desenvolvimento, teste ou descoberta, inclusive a chamada feita só para ver o
  formato de uma resposta, leva o prefixo ou a marcação que o usuário definiu e é apagado no fim.
  Pedidos podem disparar automações da conta que criam cupom ou giftback para o cliente: liste e
  apague esses cupons também.
