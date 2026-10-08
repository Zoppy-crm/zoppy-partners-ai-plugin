# Zoppy Partners AI Plugin

Agent Skills para a sua IA de código (Claude Code, Antigravity, Codex, Cursor, GitHub Copilot) integrar com a
[Partners API da Zoppy](https://partners.zoppy.com.br) sem errar o contrato: campos, valores, datas, reenvio e erros.

Cada afirmação das skills foi conferida no código da API e testada contra o ambiente de staging. Cada skill
traz exemplos executáveis e um validador de payload que a IA roda antes de devolver código.

## Skills

| Skill | Use para |
|---|---|
| `zoppy-partners-api` | Autenticação, ambientes, paginação, datas, erros e ordem de envio. Comece por aqui. |
| `zoppy-partners-clientes` | Criar, atualizar e buscar clientes; telefone, endereço e deduplicação. |
| `zoppy-partners-produtos` | Criar, atualizar e buscar produtos; vínculo com os itens do pedido. |
| `zoppy-partners-pedidos` | Pedidos: status, `subtotal`/`discount`/`shipping`, datas, reenvio pelo `PUT`. |
| `zoppy-partners-lojas` | Lojas e filiais: reaproveitar as existentes, `storeId` no pedido, loja padrão "Integrador Externo" e correção de pedidos na loja errada. |
| `zoppy-partners-vendedores` | Vendedores: cadastro, e-mail único, telefone e como o pedido acha o vendedor (`userId` ou `seller`). |
| `zoppy-partners-carrinho-abandonado` | Carrinhos abandonados e a recuperação. |
| `zoppy-partners-cupons-webhooks` | Cupons (individual e compartilhado) e webhooks de cupom criado. |

## Instalação

**Claude Code**

```
/plugin marketplace add Zoppy-crm/zoppy-partners-ai-plugin
/plugin install zoppy-partners@zoppy
```

**Antigravity (CLI `agy` e IDE)**

Instale como plugin a partir de um clone do repositório:

```bash
git clone https://github.com/Zoppy-crm/zoppy-partners-ai-plugin
agy plugin install ./zoppy-partners-ai-plugin
```

Instalado como plugin, ele também traz `rules/zoppy-partners.md`, regra que o Antigravity aplica em
toda conversa (credenciais, validador e dados de teste). Ou copie só as skills para o seu projeto, em
`.agents/skills/` (veja abaixo); cada `SKILL.md` repete essas regras.

**Codex, Cursor, GitHub Copilot e outras ferramentas compatíveis com Agent Skills**

Copie as pastas de `skills/` para `.agents/skills/` no seu projeto:

```bash
git clone https://github.com/Zoppy-crm/zoppy-partners-ai-plugin /tmp/zoppy-skills
mkdir -p .agents/skills && cp -r /tmp/zoppy-skills/skills/* .agents/skills/
```

Cada pasta funciona sozinha, então você pode copiar só as skills que usar. Para valer em todos os seus
projetos, use a pasta de usuário da sua ferramenta (por exemplo `~/.agents/skills/` no Codex, Cursor e Copilot).

**Gemini CLI**

Desde 18/06/2026 o Gemini CLI atende só licenças Gemini Code Assist Standard/Enterprise e chaves de API pagas
do Google Cloud; nos demais casos o caminho é o Antigravity, acima. Com Gemini CLI ativo, copie as skills para
`.agents/skills/` como nas outras ferramentas.

## Credenciais

Os exemplos e a IA leem três variáveis de ambiente. Peça o token e a chave `zoppy-access` ao time da Zoppy e
nunca coloque esses valores no código.

```bash
cp .env.example .env   # preencha e carregue no seu shell
```

| Variável | Conteúdo |
|---|---|
| `ZOPPY_PARTNERS_TOKEN` | Token da sua empresa (vai em `Authorization: Bearer`) |
| `ZOPPY_ACCESS` | Valor do header `zoppy-access` |
| `ZOPPY_PARTNERS_BASE_URL` | `https://api-partners-staging.zoppy.com.br` (homologação, com token e chave próprios) ou `https://api-partners.zoppy.com.br` |

## Validar um payload

```bash
node skills/zoppy-partners-pedidos/scripts/validate.mjs --schema=pedido.create --file=pedido.json
```

Saída `0` sem erro (avisos podem aparecer), `1` com erro, `2` uso incorreto. `--list-schemas` lista os payloads
da skill, `--json` devolve o resultado para máquina e `--help` mostra o uso. O validador exige Node 18 ou mais novo e
não tem dependências. Dentro de uma skill instalada, `scripts/` é relativo à pasta da skill, não ao seu projeto.

## Rodar os exemplos contra a sua conta de teste

```bash
npm run smoke                                   # todos
node tools/smoke.mjs --skill=zoppy-partners-pedidos
```

Os exemplos criam dados com o prefixo `skills-test-` e apagam o que criaram. Use uma conta de teste
sem fluxos de mensagem ativos: pedidos e carrinhos disparam os fluxos da conta, e a limpeza não
desfaz mensagem já enviada. O smoke recusa rodar contra a URL de produção; para isso numa conta de
teste, defina `ZOPPY_SMOKE_ALLOW_PRODUCTION=1`.

## Desenvolvimento

```bash
npm test          # testes das ferramentas
npm run build     # gera scripts/validate.mjs em cada skill a partir de tools/validate.mjs
npm run check     # confere formato, segredos e cópias do validador
```

Não edite `skills/*/scripts/validate.mjs`: ele é gerado. A fonte é `tools/validate.mjs`.

O `npm install` ativa um hook de pre-commit (`.githooks/pre-commit`) que roda `npm run check`, `npm test` e, se estiverem instalados, `claude plugin validate` e `agy plugin validate`. Um commit que deixe o plugin fora do formato é bloqueado.

### Evals

`evals/<skill>/<caso>/` segue o formato do `claude plugin eval`: `prompt.md` traz o pedido do desenvolvedor e
`graders/` traz os critérios (`criterios.md`, julgado por modelo) e a conferência de que a skill certa foi acionada
(`skill-acionada.md`). Cada execução chama o modelo e tem custo.

```bash
claude plugin eval . --runs 1                     # todos os casos, com e sem o plugin
claude plugin eval . --tag zoppy-partners-pedidos  # só uma skill
```

O resultado fica em `evals/results/`, que não é versionado.

## Licença

MIT
