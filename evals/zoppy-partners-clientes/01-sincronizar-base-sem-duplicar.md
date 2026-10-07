# Eval 01: sincronizar a base de clientes sem duplicar

## Pedido do desenvolvedor

> Tenho um ERP com a tabela `clientes` (id, nome_completo, celular no formato "(11) 98765-4321", email, nascimento "1990-05-15", sexo "M"/"F", rua, numero, complemento, cidade, uf, cep). Escreva um script Node que envia todos para a Zoppy pela Partners API e pode rodar todo dia sem criar cliente duplicado. Use as variáveis de ambiente da Zoppy.

## Critérios de acerto

- Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente; nenhum segredo no código.
- Manda `Authorization: Bearer <token>` e `zoppy-access: <chave>` em toda chamada.
- Faz upsert: `GET /customers/external/{id do ERP}`; 200 leva a `PUT /customers/{id da Zoppy}`; 422 leva a `POST /customers`.
- Depois do `POST`, compara o `externalId` da resposta com o enviado e, se for diferente, faz `PUT` no `id` devolvido (telefone já cadastrado).
- Separa `nome_completo` em `firstName` (primeira palavra) e `lastName` (resto), os dois como texto.
- Manda `phone` como texto; pode mandar com máscara.
- Manda `address` com `address1` (rua e número), `address2`, `city`, `state`, `postcode` como texto.
- Manda `birthDate` como `YYYY-MM-DD` e `gender` como `m`/`f`.
- Roda `node scripts/validate.mjs --schema=cliente.create` (ou `cliente.update`) em pelo menos um payload antes de enviar, ou explica como rodar.
- Não trata 404 como "não encontrado" na busca por externalId (a API responde 422).
