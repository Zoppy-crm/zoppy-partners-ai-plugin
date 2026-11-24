---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Percorre `GET /campaigns` página a página (`after`, `page`, `pageSize` até 50) e só chama `GET /campaigns/{id}` (ou `links.metrics`) das campanhas com `metricsStatus: AVAILABLE`.
- Lê as métricas do campo `metrics` do detalhe; não espera métricas na listagem.
- Guarda as métricas no próprio sistema e não chama de novo o detalhe de campanha já guardada, porque o número não muda depois de gerado.
- Nas rodadas seguintes volta só às campanhas `PENDING`; explica que `PENDING` significa que o relatório ainda não está pronto (é gerado 8 dias depois da conclusão) e que `UNAVAILABLE` não terá métricas.
- Calcula a taxa de abertura de e-mail como `email.openedCount / deliveredCount` (a API não devolve a taxa pronta).
- Trata `influencedRevenue` como valor em reais (com casas decimais), sem dividir por 100.
- Manda `Authorization: Bearer` e o header `zoppy-access`, lendo os dois de variáveis de ambiente.

## Reprova se

- Chamar o detalhe de todas as campanhas a cada rodada, inclusive as já guardadas ou as `UNAVAILABLE`.
- Procurar as métricas na resposta de `GET /campaigns` (listagem).
- Dividir a receita por 100 ou tratá-la como centavos.
- Escrever token ou `zoppy-access` direto no código.
