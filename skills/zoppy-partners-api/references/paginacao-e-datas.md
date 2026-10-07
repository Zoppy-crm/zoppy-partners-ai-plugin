# Paginação e datas

## Sumário

- Listagem completa sem duplicar
- Sincronização incremental com updatedAt
- Datas no corpo da requisição
- Datas nos filtros da listagem
- Por que mandar sempre o fuso

## Listagem completa sem duplicar

Toda listagem pede `after`, `page` e `pageSize` (inteiros; `pageSize` de 1 a 50, decimal dá 500). A ordem dos itens não é por data, então
junte por `id`:

```js
async function listAll(resource, after) {
    const byId = new Map();
    for (let page = 1; ; page++) {
        const query = new URLSearchParams({ after, page: String(page), pageSize: '50' });
        const { pagination, data } = await zoppy('GET', `/${resource}?${query}`);
        for (const item of data) byId.set(item.id, item);
        if (page >= pagination.totalPages) break;
    }
    return [...byId.values()];
}

const customers = await listAll('customers', '2020-01-01T00:00:00-03:00');
```

`zoppy()` é a função de chamada dos exemplos (headers `Authorization`, `zoppy-access` e
`Content-Type`). Sem registros, `totalPages` vem 0 e o laço para na primeira página.

## Sincronização incremental com updatedAt

`after` filtra pela data de criação do registro e `updatedAt` pela data da última alteração.
Os dois podem ir juntos: o resultado é a interseção.

Para buscar só o que mudou desde a última rodada:

1. Guarde a hora em que a rodada começou, com fuso (ex. `2026-10-07T17:00:00Z`).
2. Na rodada seguinte, mande `after=2020-01-01T00:00:00-03:00&updatedAt=<hora guardada>`.
3. Todos os itens devolvidos têm `updatedAt` maior ou igual ao valor mandado.

## Datas no corpo da requisição

Exemplo medido com o `createdAt` do pedido. O valor gravado volta em UTC.

| Você manda | Gravado | Leitura |
|---|---|---|
| `2026-09-05T10:26:00-03:00` | `2026-09-05T13:26:00.000Z` | com fuso: exato |
| `2026-09-05T13:26:00Z` | `2026-09-05T13:26:00.000Z` | com fuso: exato |
| `2026-09-05T10:26:00` | `2026-09-05T13:26:00.000Z` | sem fuso: horário de Brasília |
| `2026-09-05` | `2026-09-05T00:00:00.000Z` | só data: meia-noite UTC (21h do dia anterior em Brasília) |
| `05/09/2026 10:26` | `2026-05-09T13:26:00.000Z` | barra: mês/dia, horário de Brasília |
| `ontem` | nada, 400 | `createdAt must be a Date instance` |

## Datas nos filtros da listagem

`after` e `updatedAt` na query string. Só a data sem hora é lida diferente nos dois.

| Você manda | Em `after`, filtra a partir de | Em `updatedAt`, filtra a partir de |
|---|---|---|
| `2026-09-05T00:00:00Z` | 05/09 00:00 UTC | 05/09 00:00 UTC |
| `2026-09-05T00:00:00` | 05/09 00:00 de Brasília (03:00 UTC) | 05/09 00:00 de Brasília (03:00 UTC) |
| `2026-09-05` | 05/09 00:00 de Brasília (03:00 UTC) | 05/09 00:00 UTC |

Só em `after` (medido): `2026-10-07T14:44:58-03:00` filtra a partir de 07/10 17:44:58 UTC; `08/10/2026` vira 10/08/2026 (mês/dia); `1759859098000` e `abc` dão
422 `Invalid after date`. Em `updatedAt`, texto que não é data dá 422 `Invalid updatedAt date`.

O filtro inclui o próprio instante: um registro criado em `17:44:58Z` aparece com
`after=2026-10-07T17:44:58Z` e some com `after=2026-10-07T17:44:59Z`.

## Por que mandar sempre o fuso

A mesma data só com dia vira meia-noite UTC no corpo e no filtro `updatedAt`, mas meia-noite de
Brasília no filtro `after`: são 3 horas de diferença entre o que você grava e o que você filtra. Com fuso explícito, os dois lados
batem. Codifique datas com `toISOString()` (UTC) ou com o deslocamento `-03:00` escrito.
