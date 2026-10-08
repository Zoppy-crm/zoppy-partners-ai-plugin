---
name: zoppy-partners-vendedores
description: "Cadastra vendedores na Partners API da Zoppy (/users) e atribui cada pedido ao vendedor certo, por userId ou pelo objeto seller (email, phone, revenueRecord). Use ao gerar código que cria, lista, busca ou exclui vendedores; ao decidir como o pedido aponta o vendedor; e ao investigar pedido sem vendedor, vendedor não encontrado pelo telefone ou e-mail de vendedor recusado (User email already in use). Gatilhos: vendedor, vendedora, seller, atribuir venda ao vendedor, venda por vendedor, comissão, userId do pedido, cadastrar vendedores, equipe de vendas; em inglês: Zoppy sellers, salesperson, assign order to seller, order userId, create seller user. Não use para os valores, datas e status do pedido (veja a skill zoppy-partners-pedidos) nem para autenticação e paginação (zoppy-partners-api)."
---

# Vendedores na Partners API da Zoppy

**Regras fixas desta skill** (valem em toda tarefa, mesmo curta):
1. Antes de entregar código ou de chamar a API, rode você mesmo, no terminal, `node <pasta desta skill>/scripts/validate.mjs --schema=vendedor.create` em cada corpo de `POST /users`, e o validador de `zoppy-partners-pedidos` no pedido, e leia cada `ERRO` e `AVISO`. Não deixe essa etapa para o usuário.
2. Em teste, `name` e `revenueRecord` levam o prefixo do usuário inteiro, e o e-mail é novo a cada execução, em `@example.com`.
3. Nunca invente telefone, e-mail ou `revenueRecord` de vendedor que o usuário não deu: pergunte, ou deixe `revenueRecord` de fora.
4. Releia com `GET /users/{id}` o que gravou. Não existe `PUT /users`: confira o telefone antes de criar.

Na Partners API, vendedor é um **usuário da conta Zoppy**: criado em `POST /users` com e-mail e senha,
perfil comum. O pedido aponta o vendedor por `userId` ou pelo objeto `seller`; vendedor não encontrado
não dá erro, o pedido fica sem vendedor.

## Antes de gerar código

1. Leia a skill `zoppy-partners-api` para autenticação (`Authorization: Bearer` + `zoppy-access`), base URL e paginação. Credenciais: leia `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` só dentro do código. Nunca imprima, ecoe ou liste o ambiente (`env`, `printenv`, `echo $ZOPPY_...`) nem cole os valores em arquivo, log ou resposta; para conferir se existem, teste só a presença (`process.env[k] ? 'definida' : 'AUSENTE'`), sem mostrar o valor.
2. Dado criado em teste ou só para ver a resposta leva o prefixo definido pelo usuário e é apagado no fim (regra em `zoppy-partners-api`). Atenção: o e-mail de um vendedor excluído não pode ser usado de novo (seção "Sem duplicar"); em teste, use um e-mail novo a cada execução, num domínio reservado para teste (`@example.com`), nunca o de uma pessoa ou empresa real. Nunca exclua um usuário que você não criou.
3. Todo corpo de `POST /users` passa pelo validador antes de ser enviado ou de entrar no código que você devolve:

```bash
node scripts/validate.mjs --schema=vendedor.create '<json>'   # POST /users
```

Execute o validador, sem precisar ler o código dele (Node 18 ou mais novo, sem dependências). `scripts/validate.mjs` fica na pasta desta skill (a pasta deste SKILL.md), não no projeto em que você trabalha: rode o comando de dentro dela ou troque `scripts/` pelo caminho completo (no Claude Code, `${CLAUDE_SKILL_DIR}/scripts/validate.mjs`). Saída `0` sem `ERRO` (pode ter `AVISO`), `1` com `ERRO`, `2` uso incorreto. `--file=<caminho>` lê o payload de um arquivo, `--json` devolve o resultado para máquina e `--help` mostra o uso. `AVISO` aponta algo que a API aceita com 200 mas grava diferente do que você espera.

O corpo do pedido (com `userId` ou `seller`) passa pelo validador da skill `zoppy-partners-pedidos`.

## Endpoints

| Método e rota | O que faz | Sucesso | Não encontrado |
|---|---|---|---|
| `GET /users?after=...&page=1&pageSize=50` | Lista os usuários da conta criados a partir de `after`; `updatedAt` opcional filtra por alteração | 200 `{data, pagination}` | |
| `GET /users/count` | Quantidade de usuários da conta | 200, número puro (`4`) | |
| `GET /users/{id}` | Busca pelo id da Zoppy | 200 | 404 `Usuário não encontrado` |
| `POST /users` | Cria | 200 | |
| `DELETE /users/{id}` | Exclui | 200 com corpo vazio | 400 `Usuário não encontrado` |

- Não existe `PUT /users`: `PUT /users/{id}` responde 404 `Cannot PUT /users/...`. Vendedor não é atualizado pela API (nome, telefone e `revenueRecord` ficam como foram criados).
- A listagem e a contagem trazem **todos os usuários da conta**, inclusive administradores (`role` `ADMIN` ou `MASTER`), não só vendedores. Cada item da listagem traz `id`, `email`, `name`, `nickName`, `userName`, `role`, `createdAt` e `deletedAt`, sem telefone nem `revenueRecord`; para eles, use `GET /users/{id}`. Usuários excluídos não aparecem (`deletedAt` vem sempre `null`).
- O `DELETE` responde corpo vazio: não faça `JSON.parse` dele.

## Campos do `POST /users`

| Campo | Tipo | Obrigatório | O que a API faz |
|---|---|---|---|
| `email` | string | sim | Precisa ter formato de e-mail (400 `email must be an email`). Vira também o `userName`. É único em toda a Zoppy (veja abaixo) |
| `name` | string | sim | Ausente: 400 `name must be a string`; `""`: 422 `Name is mandatory.` |
| `phone` | string | sim | Celular brasileiro com DDD (`11987654321`, também aceita `+55`, máscara e celular sem o 9). Fixo ou número inválido: 422 `Invalid phone number.`; número JSON: 400. **Gravado como veio** |
| `password` | string | sim | Pelo menos 6 caracteres, com minúscula, maiúscula, número e símbolo (`Skills@123`). Ausente ou fraca: 422 `Password does not attend security standarts.` |
| `nickName` | string | não | Ausente: grava o `name` |
| `revenueRecord` | string | não | Código do vendedor no seu sistema (matrícula, CPF). Gravado e usado para achar o vendedor no pedido. `""` também é gravado: omita o campo quando não houver código |

Envie apenas os campos desta tabela: um campo fora dela pode ser gravado no usuário ou descartado, sem
aviso (por exemplo, `storeId` é descartado). Erros de regra saem juntos no mesmo 422, separados por vírgula.

Resposta do `POST`: o usuário criado com `id` (o `userId` do pedido), `email`, `name`, `nickName`,
`userName`, `phone`, `revenueRecord` (se enviado), `role: "COMMON"`, `active: true` e `createdAt`.
Guarde o `id`.

### Telefone: grave só DDD + número

O pedido acha o vendedor por telefone comparando o número **normalizado** (sem `+55`, sem máscara) com
o telefone **como foi gravado**. Vendedor criado com `"+55 (11) 90008-0012"` nunca é achado por
`seller.phone`, nem mandando o mesmo texto. O mesmo vale para celular gravado sem o 9 (`1100080063`):
a API aceita no cadastro, mas o pedido acrescenta o 9 antes de comparar e não o acha. Crie o vendedor
com `phone` só em dígitos, DDD + 9 + 8 dígitos, sem 55 (`11900080012`). Como não existe `PUT /users`, um telefone gravado errado não se
corrige pela API: confira antes de criar.

## Sem duplicar

- O `email` é a chave: repetido responde 422 `User email already in use.`, sem diferenciar maiúsculas.
- Vale para **toda a Zoppy**, não só para a sua conta: um e-mail já usado por um usuário de outra conta Zoppy também responde 422, e ele não aparece na sua listagem.
- Vale também para usuário **excluído**: depois de `DELETE /users/{id}`, o mesmo e-mail responde 422 para sempre. Exclua vendedor só quando for definitivo.

Para sincronizar a equipe de vendas:

1. Liste `GET /users` (todas as páginas, `after` antigo) e monte o mapa `email em minúsculas → id`.
2. Vendedor que já está no mapa: use o `id`. Não há atualização pela API.
3. Vendedor que não está: `POST /users`. Guarde o `id` da resposta.
4. `422 User email already in use.` para um e-mail que não está na sua listagem: o e-mail é de outra conta Zoppy ou de um usuário excluído. Peça ao usuário outro e-mail para esse vendedor ou fale com o time da Zoppy.

## Como o pedido acha o vendedor

No `POST /orders` e no `PUT /orders/{id}` (skill `zoppy-partners-pedidos`):

| Envio | Vendedor gravado (`userId` do pedido) |
|---|---|
| `userId` de um usuário da conta (não excluído) | Esse usuário. O `seller` é ignorado |
| `userId` que não existe na conta | Tenta o `seller`; sem `seller`, nenhum |
| `seller.email` | Usuário da conta com esse e-mail, sem diferenciar maiúsculas |
| `seller.revenueRecord` | Usuário da conta com esse `revenueRecord` |
| `seller.phone` | Usuário da conta cujo telefone gravado é igual ao número normalizado (seção "Telefone") |
| Nada casa, `seller: {}` ou vendedor excluído | Nenhum: 200, `userId: null` na leitura, sem erro |

- Os três campos do `seller` são alternativos: basta um casar. Se mais de um vier e eles apontarem para vendedores diferentes, a API escolhe um deles sem regra: mande um campo só.
- Qualquer usuário da conta pode ser o vendedor, inclusive um administrador.
- `seller.phone` é normalizado antes de comparar: sem `55`, sem máscara e, em celular de 8 dígitos, com o 9 acrescentado. `1100080061` e `(11) 0008-0061` acham o vendedor gravado como `11900080061`.
- `seller.revenueRecord: ""` não é ignorado: acha o vendedor cadastrado com `revenueRecord` vazio. Sem vendedor, omita o `seller`.
- A resposta do `POST /orders` sem vendedor vem sem o campo `userId`; o `GET` traz `userId: null`.
- **Use `userId`** (o `id` guardado no cadastro) ou `seller.email`. Telefone depende de como o vendedor foi gravado.

No `PUT /orders/{id}`: sem `userId` e sem `seller`, ou com vendedor sem correspondência, o pedido mantém
o vendedor que tinha; com `userId` válido, troca. Não há como tirar o vendedor de um pedido pela API.

Excluir o vendedor não muda os pedidos já gravados: eles continuam com o `userId` dele.

## Vendedor e loja

A Partners API não liga vendedor a loja: `POST /users` descarta `storeId`, e o pedido grava a loja
(`storeId`) e o vendedor (`userId`) de forma independente. Um vendedor pode aparecer em pedidos de
várias lojas. Loja do pedido: skill `zoppy-partners-lojas`.

## Erros comuns

| Situação | Status e corpo |
|---|---|
| `email` ausente ou sem formato de e-mail | 400 `{"message":["email must be an email"],"error":"Bad Request","statusCode":400}` |
| `name` ausente | 400 `name must be a string` |
| `name` vazio | 422 `Name is mandatory.` |
| `phone` ausente ou número JSON | 400 `phone must be a string` |
| Telefone fixo ou inválido | 422 `Invalid phone number.` |
| Senha ausente ou fraca | 422 `Password does not attend security standarts.` |
| E-mail já usado (nesta ou em outra conta Zoppy, inclusive excluído) | 422 `User email already in use.` |
| `GET /users/{id}` inexistente | 404 `Usuário não encontrado` |
| `DELETE /users/{id}` inexistente ou já excluído | 400 `Usuário não encontrado` |
| `PUT /users/{id}` | 404 `Cannot PUT /users/{id}` (rota não existe) |
| Vendedor do pedido não encontrado | 200, pedido sem vendedor |

## Exemplos

Use os exemplos como modelo de código: leia o arquivo e adapte ao projeto. Só execute um exemplo se
o usuário pedir, com as três variáveis de ambiente de uma conta de teste e a partir da pasta desta
skill (os caminhos abaixo são relativos a ela). Os que gravam dados usam o prefixo `skills-test-` e
apagam o que criaram.

- `assets/examples/01-vendedor-e-pedido.mjs`: cadastra um vendedor (telefone só em dígitos), manda pedidos atribuídos por `userId`, `seller.email`, `seller.phone` e `seller.revenueRecord`, confere o `userId` na leitura e apaga tudo.
