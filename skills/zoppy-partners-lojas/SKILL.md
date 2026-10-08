---
name: zoppy-partners-lojas
description: "Cadastra e reaproveita lojas na Partners API da Zoppy (/stores) e faz cada pedido cair na loja certa. Use ao gerar código que lista, cria, atualiza ou exclui lojas e filiais; ao mapear as filiais de um ERP ou PDV para as lojas que já existem na conta (inclusive as criadas por outra integração); ao escolher entre storeId e o objeto store no pedido; ao conferir quantos pedidos caíram em cada loja; e ao investigar ou corrigir pedidos gravados na loja padrão Integrador Externo, lojas duplicadas da mesma filial e relatório por loja dividido. Gatilhos: loja física, filial, cadastro de lojas, Integrador Externo, storeId, pedido na loja errada, corrigir loja do pedido, lojas duplicadas, relatório por loja; em inglês: Zoppy stores, store branches, order storeId, default store, orders in the wrong store, duplicated stores. Não use para os valores, datas e status do pedido (veja a skill zoppy-partners-pedidos) nem para autenticação e paginação (zoppy-partners-api)."
---

# Lojas na Partners API da Zoppy

**Regras fixas desta skill** (valem em toda tarefa, mesmo curta):
1. Antes de entregar código ou de chamar a API, rode você mesmo, no terminal, `node <pasta desta skill>/scripts/validate.mjs --schema=loja.create` (ou `loja.update`) em cada corpo de loja, e o validador de `zoppy-partners-pedidos` no pedido, e leia cada `ERRO` e `AVISO`. Não deixe essa etapa para o usuário.
2. Em teste, `externalId` e `name` da loja levam o prefixo do usuário inteiro; no fim, apague só as lojas que você criou, pelo `id` guardado no cadastro; nunca apague loja por filtro de nome ou código, porque outra integração pode usar código parecido. Se a execução quebrou antes de guardar o `id`, ache a loja com `GET /stores/external/{externalId}` exato, nunca filtrando a listagem.
3. Nunca decida sozinho qual loja existente é uma filial: procure na listagem pelo nome ou pelo código que o usuário deu (sem diferenciar maiúsculas e acentos), ou pergunte, e diga no relatório qual loja reaproveitou.
4. Para corrigir a loja de um pedido recém-criado, espere alguns segundos depois do `POST` antes do `PUT`: um `PUT` logo em seguida pode ser desfeito.
5. Releia com `GET /orders/{id}` o que gravou e repita o `PUT` se a loja não mudou.

Na Zoppy, todo pedido fica gravado numa loja (o `storeId` do pedido). Pedido sem loja reconhecida
não dá erro: cai na loja padrão "Integrador Externo".

## Antes de gerar código

1. Leia a skill `zoppy-partners-api` para autenticação (`Authorization: Bearer` + `zoppy-access`), base URL e paginação. Credenciais: leia `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` só dentro do código. Nunca imprima, ecoe ou liste o ambiente (`env`, `printenv`, `echo $ZOPPY_...`) nem cole os valores em arquivo, log ou resposta; para conferir se existem, teste só a presença (`process.env[k] ? 'definida' : 'AUSENTE'`), sem mostrar o valor.
2. Dado criado em teste ou só para ver a resposta leva o prefixo definido pelo usuário e é apagado no fim (regra em `zoppy-partners-api`). Isso vale para lojas: nunca altere nem exclua uma loja que você não criou.
3. **Liste as lojas da conta antes de criar qualquer uma** (seção "Antes de criar: reaproveitar"). Outra integração pode já ter cadastrado a mesma filial.
4. Todo corpo de `POST` e `PUT` de loja passa pelo validador antes de ser enviado ou de entrar no código que você devolve:

```bash
node scripts/validate.mjs --schema=loja.create '<json>'   # POST /stores
node scripts/validate.mjs --schema=loja.update '<json>'   # PUT /stores/{id}
```

Execute o validador, sem precisar ler o código dele (Node 18 ou mais novo, sem dependências). `scripts/validate.mjs` fica na pasta desta skill (a pasta deste SKILL.md), não no projeto em que você trabalha: rode o comando de dentro dela ou troque `scripts/` pelo caminho completo (no Claude Code, `${CLAUDE_SKILL_DIR}/scripts/validate.mjs`). Saída `0` sem `ERRO` (pode ter `AVISO`), `1` com `ERRO`, `2` uso incorreto. `--file=<caminho>` lê o payload de um arquivo, `--json` devolve o resultado para máquina e `--help` mostra o uso. `AVISO` aponta algo que a API aceita com 200 mas grava diferente do que você espera.

O corpo do pedido (com `storeId` ou `store`) passa pelo validador da skill `zoppy-partners-pedidos` (`--schema=pedido.create` ou `pedido.update`), que avisa quando o pedido vai para a loja padrão.

## Endpoints

| Método e rota | O que faz | Sucesso | Não encontrado |
|---|---|---|---|
| `GET /stores?after=...&page=1&pageSize=50` | Lista as lojas ativas criadas a partir de `after` | 200 `{pagination, data}` | |
| `GET /stores/{id}` | Busca pelo id da Zoppy | 200 | 404 `Store not found` |
| `GET /stores/external/{externalId}` | Busca pelo seu código | 200 | 404 `Store not found` |
| `POST /stores` | Cria, ou atualiza a loja que já tem esse `externalId` | 200 | |
| `PUT /stores/{id}` | Atualiza pelo id da Zoppy | 200 | 404 `Store not found` |
| `DELETE /stores/{id}` | Exclui (a loja fica inativa) | 200 `{"result":true}` | 404 `Store not found` |

Na listagem, `after` é obrigatório e `pageSize` vai até 50, como em todas as listagens (skill `zoppy-partners-api`). Para ver todas as lojas, use uma data antiga: `after=2020-01-01T00:00:00-03:00`.

## Campos

| Campo | Tipo | Obrigatório | O que a API faz |
|---|---|---|---|
| `name` | string | sim | Gravado como veio: sem `trim`, sem mudar maiúsculas. Ausente responde 400 `name must be a string`; `""` é aceito e grava loja sem nome |
| `externalId` | string | não, mas mande sempre | Código da filial no seu sistema. É a chave do `POST` (veja abaixo). Número JSON responde 400 `externalId must be a string` |
| `isEcommerce` | boolean | não | `true` para loja virtual, `false` (padrão) para loja física. Qualquer valor "verdadeiro" vira `true`: o texto `"false"` grava `isEcommerce: true` |

Resposta (`GET`, `POST`, `PUT` e cada item da listagem): `id` (o `storeId` que o pedido usa), `externalId`, `name`, `isEcommerce`, `createdAt`, `updatedAt`. A loja não tem endereço, CNPJ nem campo de ativa: a loja que aparece na API está ativa.

## Sem duplicar: o `externalId`

| Situação no `POST /stores` | Resultado |
|---|---|
| `externalId` novo | Cria a loja |
| `externalId` de uma loja ativa | Não cria outra: troca o `name` dessa loja e devolve o mesmo `id`. `isEcommerce` só muda se vier no corpo |
| Mesmo `externalId` com outras maiúsculas (`LOJA-01` e `loja-01`) | É a mesma loja; o `externalId` gravado não muda |
| Sem `externalId` (ou `""`) | Cada `POST` cria uma loja nova, mesmo com nome igual |
| `externalId` de uma loja excluída | Cria uma loja nova, com outro `id` |

O `externalId` vale para todas as lojas ativas da conta, inclusive as criadas por outra integração.
Se o seu código de filial for igual ao `externalId` de uma loja que outra integração criou, o seu
`POST` renomeia aquela loja. Confira na listagem antes.

O `externalId` não é único na conta: o `PUT /stores/{id}` aceita o código de outra loja ativa, e outra
integração pode usar o mesmo código que você. Com duas lojas ativas de mesmo código, o `POST`, a busca
por código e o `store.externalId` do pedido pegam uma delas, sem garantia de qual.

## Antes de criar: reaproveitar as lojas existentes

A conta pode já ter lojas criadas por outra integração (um ERP, um PDV, a plataforma de e-commerce),
com outros códigos e nomes escritos de outro jeito ("LJ BH" e "LOJA BELO HORIZONTE"). Criar outra
loja para a mesma filial deixa os pedidos dessa filial divididos entre duas lojas, e tudo o que é
separado por loja passa a mostrar a filial em dois pedaços. Por isso:

1. Liste todas as lojas (`GET /stores`, todas as páginas) e procure códigos repetidos (duas lojas com o mesmo `externalId`, sem diferenciar maiúsculas e acentos): leve esses casos ao usuário antes de mapear.
2. Monte com o usuário uma tabela **filial do seu sistema → `storeId` existente**. Compare nome e
   código ignorando maiúsculas, acentos e espaços, mas **confirme cada par com o usuário**: só ele
   sabe se "LJ BELV" é a mesma filial que "LOJA BELVEDERE". Não decida sozinho, nem quando o código
   é igual: códigos de sistemas diferentes são independentes (o `005` de um ERP pode ser outra filial
   no PDV). Reaproveite sem perguntar só a loja que já está no mapa salvo da sua integração.
3. Crie (`POST /stores` com `externalId` = código da filial) só as filiais que o usuário confirmou que não existem.
4. Guarde o `storeId` de cada filial na sua base e mande esse `storeId` em todos os pedidos.

Se a filial existe mas foi criada por outra integração, use o `storeId` dela como está. Não renomeie
nem troque o `externalId` de uma loja que não é sua: a outra integração depende deles. Código completo:
`assets/examples/01-filiais-e-pedidos.mjs`.

## Como o pedido escolhe a loja

O pedido (`POST /orders` e `PUT /orders/{id}`, skill `zoppy-partners-pedidos`) aceita `storeId` ou o
objeto `store`. A Zoppy decide nesta ordem:

| Envio | Loja gravada |
|---|---|
| `storeId` de loja ativa | Essa loja. Com `storeId`, o `store` é ignorado |
| `storeId` inexistente ou de outra conta | 422 `Store not found for this company (storeId: ...)`, nada é gravado |
| `storeId` de loja excluída (inativa) | 422 `Store "<nome>" is inactive and cannot receive orders (storeId: ...). Reactivate it in the Zoppy panel, under the integration that owns this store.` |
| `store: { externalId }` ou `store: { name }` | Uma loja ativa com esse `externalId` **ou** esse `name` |
| `store` sem nenhuma loja correspondente, `store: {}` ou `store` em texto | Loja padrão "Integrador Externo", com 200 e sem aviso, no `POST` e no `PUT` |
| Nada, ou `storeId: ""` sem `store` | No `POST`, loja padrão. No `PUT`, a loja do pedido não muda |

Como o `store` casa:

- Sem diferenciar maiúsculas e acentos: `"loja sao paulo"` acha "Loja São Paulo"; `"LOJA-01"` acha `loja-01`.
- Espaços contam: `"LJ CENTRO "` (espaço no fim) não acha "LJ CENTRO", e "LJ BH" não acha uma loja gravada como `"LJ  BH"`.
- Duas lojas ativas com o mesmo nome: o pedido vai para uma delas, sempre a mesma, mas não necessariamente a mais antiga. Não há como escolher pelo nome.
- `name` e `externalId` juntos que apontam para lojas diferentes: vai para uma das duas, sem garantia de qual.
- Loja excluída nunca casa pelo `store`: o pedido vai para a loja padrão.
- `store` mandado como texto (`"store": "Loja Centro"`) é aceito e vai para a loja padrão.
- Texto vazio não é ignorado: `store.externalId: ""` casa com uma loja de código vazio e `store.name: ""` com uma loja sem nome, se a conta tiver (e o campo vazio ganha do outro campo). Omita o campo em vez de mandar `""`.

**Use `storeId`.** Ele falha alto (422) quando está errado; o `store` erra em silêncio.

No `PUT /orders/{id}`: sem `storeId` e sem `store` (ou com `store: null` ou `storeId: ""`), a loja do
pedido não muda. Com `store` sem correspondência, `store: {}` ou `store` em texto, o pedido **sai da
loja em que estava** e vai para a loja padrão.

## A loja padrão "Integrador Externo"

- É uma loja comum da conta: aparece em `GET /stores` com o nome `Integrador Externo` e um `externalId` gerado pela Zoppy. Identifique o `id` dela pelo nome.
- Se a conta ainda não tem essa loja, a Zoppy a cria no primeiro pedido que precisar dela.
- Pedido nela costuma ser pedido de filial que não foi identificada: `storeId` ausente, `store` com nome diferente do cadastrado ou com espaço sobrando.
- Ela é uma só por conta: recebe os pedidos sem loja de qualquer integração que use a Partners API na conta, não só os seus.

## Conferência depois da carga

A listagem de pedidos não filtra por loja. Conte do seu lado:

1. `GET /stores` (todas as páginas) e monte o mapa `id → name`.
2. `GET /orders?after=<início do período>&page=N&pageSize=50` até `page >= totalPages`. Cada pedido traz `storeId`, sem o nome da loja. `after` filtra pela data da venda (`createdAt`) e não tem fim: descarte os pedidos depois do fim do período.
3. Agrupe por `storeId` e compare com o total de cada filial no seu sistema.
4. Pedidos com o `storeId` do "Integrador Externo" são os que não acharam a filial: corrija (próxima seção) e ajuste o envio para mandar `storeId`.

## Corrigir pedidos gravados na loja errada

O `PUT /orders/{id}` com o `storeId` certo troca a loja do pedido. Total, desconto, frete, status,
datas, conteúdo dos itens, cupom, vendedor, `provider` e `externalId` ficam como estavam, **desde que o
`PUT` leve o pedido inteiro**: o `PUT` é reenvio completo (skill `zoppy-partners-pedidos`). Os itens são
recriados com outro `id` e o `updatedAt` do pedido vira a hora do `PUT`: quem guardou o `id` do item ou
sincroniza por `updatedAt` vai ver esses pedidos de novo. Um `PUT` só com
`storeId` responde 400; um `PUT` sem `discount`, `shipping` ou `lineItems` grava total 0 ou apaga os itens.

Procedimento em lote:

1. Ache o `id` da loja padrão e o `storeId` certo de cada filial (seção anterior).
2. Liste os pedidos do período (`GET /orders?after=...`) e separe os que estão com o `storeId` da loja padrão. Para cada um, descubra a filial pelo `externalId` do pedido no seu sistema. **Só mexa em pedido cujo `externalId` existe no seu sistema**: a loja padrão é compartilhada por todas as integrações da conta, e um pedido dela que você não reconhece é de outra integração. Não altere; leve ao time da Zoppy.
3. Para cada pedido, leia `GET /orders/{id}` e monte o `PUT` a partir da leitura: `status`, `subtotal`, `discount`, `shipping`, `createdAt`, `completedAt` (se `completed`), `lineItems` (`productId` e `quantity` de cada item) e o `storeId` certo. **Não mande `couponCode`** (ausente mantém o cupom; um código que não existe na Zoppy faz o `PUT` responder 422), nem vendedor nem `provider` (ausentes, mantêm).
4. Valide com `node <pasta da skill zoppy-partners-pedidos>/scripts/validate.mjs --schema=pedido.update`. Num corpo montado da leitura, o AVISO de conferência do frete aparece em todo pedido com frete e é esperado: o `subtotal` lido de volta já inclui o frete.
5. Espere alguns segundos e leia de novo: confira `storeId`, `total`, `createdAt` e a quantidade de itens contra a leitura do passo 3. Se não refletiu, reenvie.
6. Vá devagar (um pedido por vez ou pouco paralelismo) e guarde um relatório pedido → loja antiga → loja nova.

Todo `PUT` de pedido passa de novo pelo processamento de pedidos da Zoppy, como o `POST`. Antes de
corrigir pedidos reais em lote, confira com o time da Zoppy os fluxos de automação ligados na conta
(skill `zoppy-partners-pedidos`, seção "Automações da conta"). Código completo:
`assets/examples/02-corrigir-loja-padrao.mjs`.

## Atualizar e excluir

- `PUT /stores/{id}`: `name` é obrigatório. `isEcommerce` ausente grava `false` (uma loja virtual vira física): mande sempre. `externalId` ausente mantém o código gravado, mas a resposta do `PUT` vem sem o campo; confira com `GET`.
- `DELETE /stores/{id}`: a loja some de `GET /stores`, `GET /stores/{id}` e `GET /stores/external/...` (404), fica inativa e passa a recusar pedidos por `storeId` (422 acima). Os pedidos já gravados nela continuam com esse `storeId`. Excluir de novo responde 404.
- Uma loja inativa só volta pelo painel da Zoppy. Um `POST` com o mesmo `externalId` cria outra loja, com outro `id`; os pedidos antigos continuam na inativa.
- Lojas de outras integrações também podem estar inativas (a integração foi desligada). Não exclua nem recrie lojas para "consertar" isso: fale com o time da Zoppy.

## Erros comuns

| Situação | Status e corpo |
|---|---|
| `POST`/`PUT` sem `name` | 400 `{"message":["name must be a string"],"error":"Bad Request","statusCode":400}` |
| `externalId` número | 400 `externalId must be a string` |
| Loja inexistente em `GET`, `PUT`, `DELETE` ou busca por `externalId` | 404 `{"message":"Store not found","error":"Not Found","statusCode":404}` |
| Pedido com `storeId` inexistente | 422 `Store not found for this company (storeId: ...)` |
| Pedido com `storeId` de loja excluída | 422 `Store "<nome>" is inactive and cannot receive orders ...` |
| Pedido com `store` sem correspondência | 200, pedido na loja padrão "Integrador Externo" |

## Onde lojas e vendedores se encontram

O pedido guarda a loja (`storeId`) e o vendedor (`userId`) separados: a Partners API não liga vendedor a
loja. Vendedor do pedido: skill `zoppy-partners-vendedores`.

## Exemplos e referências

Use os exemplos como modelo de código: leia o arquivo e adapte ao projeto. Só execute um exemplo se
o usuário pedir, com as três variáveis de ambiente de uma conta de teste e a partir da pasta desta
skill (os caminhos abaixo são relativos a ela). Os que gravam dados usam o prefixo `skills-test-` e
apagam o que criaram.

- `assets/examples/01-filiais-e-pedidos.mjs`: cadastra 3 filiais sem duplicar: reaproveita sozinho só o mapa salvo da integração, devolve "a confirmar" as lojas de outra integração com o mesmo código ou nome (sem diferenciar maiúsculas e acentos), cria só a que falta, manda um pedido para cada filial por `storeId` e confere a loja na leitura.
- `assets/examples/02-corrigir-loja-padrao.mjs`: pedido que caiu no "Integrador Externo" (e que existe no seu sistema) é corrigido com `PUT` completo, conferindo que só a loja mudou.
- `references/casos-de-borda.md`: cada caso de loja e de escolha da loja com o envio e o resultado reais.
