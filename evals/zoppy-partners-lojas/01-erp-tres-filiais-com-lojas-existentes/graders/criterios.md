---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente; nenhum segredo no código.
- Lista as lojas existentes (`GET /stores`, todas as páginas) antes de criar qualquer uma.
- Reconhece que FÁBRICA e LOJA BELO HORIZONTE provavelmente já existem como `FABR` (`001`) e `LJ BH ` (`004`), criadas por outra integração, e pede ao usuário para confirmar esses pares em vez de decidir sozinho.
- Explica que criar outra loja para uma filial que já existe deixa os pedidos dessa filial divididos entre duas lojas.
- Não trata `LJ PINHEIROS` como LOJA SÃO PAULO sem confirmação do usuário (nome diferente; pode ser outra filial).
- Usa um mapa filial do ERP → `storeId` e cria por `POST /stores` (com `externalId` = código da filial e `name`) só as filiais sem loja confirmada.
- Manda o `storeId` em todo pedido, e não o objeto `store` por nome.
- Avisa que pedido sem loja reconhecida não dá erro e cai na loja padrão "Integrador Externo".

## Erros que reprovam

- Criar as 3 filiais sem olhar as lojas existentes.
- Renomear, trocar o `externalId` ou excluir uma loja que a outra integração criou (por exemplo `POST /stores` com `externalId` `001` ou `004`, ou `PUT` nessas lojas).
- Apontar a loja do pedido por `store: { name: "LJ BH" }` (a loja gravada tem espaço no fim e o pedido iria para a loja padrão).
