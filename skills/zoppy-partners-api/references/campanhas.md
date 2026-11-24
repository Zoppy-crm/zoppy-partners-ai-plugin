# Campanhas e métricas de performance

## Sumário

- O que a API entrega
- Quando as métricas ficam prontas (metricsStatus)
- Campos de metrics
- Montar um painel com todas as campanhas
- O que não vem

## O que a API entrega

`/campaigns` é só leitura. `GET /campaigns` lista as campanhas da conta com o funil de envio
(`targetGroupCount`, `sentCount`, `failedCount`, `suppressedCount`) e as referências de segmento e
modelo de mensagem. A listagem **não** traz métricas de performance: cada item traz `metricsStatus`
e `links.metrics`, o caminho do detalhe (`/campaigns/{id}`).

`GET /campaigns/:id` traz a campanha mais o campo `metrics`, com aberturas, cliques, leituras,
respostas, pedidos e receita. Os números vêm do relatório de performance da campanha, os mesmos do
relatório no painel da Zoppy.

## Quando as métricas ficam prontas (metricsStatus)

| `metricsStatus` | Significa | `metrics` |
|---|---|---|
| `AVAILABLE` | o relatório foi gerado | objeto (no detalhe) |
| `PENDING` | campanha em envio, concluída há menos de 8 dias, ou relatório sendo gerado | `null` |
| `UNAVAILABLE` | canal sem relatório (só `whatsapp`, `email` e `sms` têm), campanha que falhou, concluída há mais de 180 dias sem relatório, ou relatório com mais de 365 dias (retenção) | `null` |

O relatório é gerado 8 dias depois da conclusão, para contar os pedidos que chegam depois do envio,
e não muda mais. Na listagem, `AVAILABLE` é calculado sem ler o relatório. Se a leitura falhar no
detalhe, o detalhe responde `200` com `UNAVAILABLE` e `metrics: null`, sem erro.

## Campos de metrics

Comuns a todos os canais: `reportGeneratedAt`, `targetGroupCount`, `sentCount`, `deliveredCount`,
`undeliveredCount`, `failedCount`, `suppressedCount`, `ordersCount` (pedidos atribuídos à campanha),
`influencedRevenue` (receita desses pedidos) e `averageTicket`. Os dois valores em dinheiro vêm arredondados em
centavos. No SMS, `deliveredCount` é sempre 0: o canal não confirma entrega.

Por canal (os blocos dos outros canais vêm `null`):

| Bloco | Campos |
|---|---|
| `email` | `openedCount` (quem clicou também conta como abertura), `clickedCount`, `bounceCount`, `spamCount` |
| `whatsapp` | `readCount`, `repliedCount` (respostas dentro de `replyWindowHours` horas), `replyRate` (`repliedCount / deliveredCount`, de 0 a 1), `replyWindowHours` |
| `sms` | `clickedCount` (cliques nos links rastreados), `hasTrackedLinks` (quando `false`, `clickedCount` é sempre 0) |

A API devolve contagens (exceto `replyRate`); as taxas se calculam no seu sistema. Para bater com o
relatório de performance da campanha no painel (o mesmo snapshot que a API lê):

| Taxa | Conta |
|---|---|
| Abertura de e-mail | `email.openedCount / deliveredCount` |
| Clique de e-mail | `email.clickedCount / deliveredCount` |
| Leitura de WhatsApp | `whatsapp.readCount / deliveredCount` |
| Resposta de WhatsApp | `whatsapp.repliedCount / deliveredCount` (é o `replyRate`) |
| Clique de SMS | `sms.clickedCount / sentCount` |
| Entrega | `deliveredCount / sentCount` |

## Montar um painel com todas as campanhas

1. Percorra `GET /campaigns` página a página (veja [paginacao-e-datas.md](paginacao-e-datas.md)).
2. Chame `GET /campaigns/{id}` só para as campanhas com `metricsStatus: AVAILABLE` que você ainda não
   guardou. Guarde `metrics` no seu sistema: o número não muda depois de gerado, então não chame o
   detalhe de novo para a mesma campanha.
3. Nas próximas rodadas, volte só às campanhas que estavam `PENDING`. `UNAVAILABLE` não muda.

```js
async function syncCampaignMetrics(stored) {
    for (let page = 1; ; page++) {
        const query = new URLSearchParams({ after: '2020-01-01T00:00:00-03:00', page: String(page), pageSize: '50' });
        const { pagination, data } = await zoppy('GET', `/campaigns?${query}`);
        for (const campaign of data) {
            if (campaign.metricsStatus !== 'AVAILABLE' || stored.has(campaign.id)) continue;
            const detail = await zoppy('GET', campaign.links.metrics);
            if (detail.metrics) stored.set(campaign.id, detail.metrics);
        }
        if (page >= pagination.totalPages) break;
    }
}
```

Chame o detalhe em sequência (uma campanha por vez), não em rajada paralela.

## O que não vem

Nenhum dado dos clientes que compraram (nome, telefone, e-mail), nem a lista de pedidos, nem o custo
da campanha. Para pedidos, use `GET /orders` (skill zoppy-partners-pedidos).
