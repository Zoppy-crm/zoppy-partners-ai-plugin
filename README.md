# Zoppy Partners AI Plugin

Agent Skills para a sua IA de código (Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot) integrar com a
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
| `zoppy-partners-carrinho-abandonado` | Carrinhos abandonados e a recuperação. |
| `zoppy-partners-cupons-webhooks` | Cupons (individual e compartilhado) e webhooks de cupom criado. |

## Instalação

**Claude Code**

```
/plugin marketplace add Zoppy-crm/zoppy-partners-ai-plugin
/plugin install zoppy-partners@zoppy
```

**Gemini CLI**

```
gemini skills install https://github.com/Zoppy-crm/zoppy-partners-ai-plugin
```

**Codex, Cursor, GitHub Copilot e outras ferramentas compatíveis com Agent Skills**

Copie as pastas de `skills/` para `.agents/skills/` no seu projeto:

```bash
git clone https://github.com/Zoppy-crm/zoppy-partners-ai-plugin /tmp/zoppy-skills
mkdir -p .agents/skills && cp -r /tmp/zoppy-skills/skills/* .agents/skills/
```

Cada pasta funciona sozinha, então você pode copiar só as skills que usar.

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
| `ZOPPY_PARTNERS_BASE_URL` | `https://api-partners-staging.zoppy.com.br` (testes) ou `https://api-partners.zoppy.com.br` |

## Validar um payload

```bash
node skills/zoppy-partners-pedidos/scripts/validate.mjs --schema=pedido.create --file=pedido.json
```

Saída `0` sem erro (avisos podem aparecer), `1` com erro, `2` uso incorreto. `--list-schemas` lista os payloads
da skill e `--json` devolve o resultado para máquina. O validador exige Node 18 ou mais novo e não tem dependências.

## Rodar os exemplos contra a sua conta de teste

```bash
npm run smoke                                   # todos
node tools/smoke.mjs --skill=zoppy-partners-pedidos
```

Os exemplos criam dados com o prefixo `skills-test-` e apagam o que criaram. Use uma conta de teste.

## Desenvolvimento

```bash
npm test          # testes das ferramentas
npm run build     # gera scripts/validate.mjs em cada skill a partir de tools/validate.mjs
npm run check     # confere formato, segredos e cópias do validador
```

Não edite `skills/*/scripts/validate.mjs`: ele é gerado. A fonte é `tools/validate.mjs`.

## Licença

MIT
