---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- Lê `ZOPPY_PARTNERS_TOKEN`, `ZOPPY_ACCESS` e `ZOPPY_PARTNERS_BASE_URL` do ambiente; nenhum segredo no código.
- Antes de criar, lista os usuários da conta (`GET /users`, todas as páginas) e reaproveita o `id` de quem já existe pelo e-mail (comparando sem diferenciar maiúsculas).
- Cria só os que faltam com `POST /users` mandando `email`, `name`, `phone` e `password` (senha com 6 ou mais caracteres, minúscula, maiúscula, número e símbolo).
- Converte o celular para só dígitos, DDD + número, sem 55 e sem máscara (`11987654321`), e explica que gravado com `+55` ou máscara o vendedor não é achado por `seller.phone`.
- Manda a matrícula em `revenueRecord`.
- Trata `422 User email already in use.` para e-mail fora da listagem como e-mail usado em outra conta Zoppy ou por usuário excluído, sem tentar de novo em loop.
- Atribui o pedido por `userId` (o `id` guardado) ou `seller.email`.
- Avisa que vendedor não encontrado não dá erro: o pedido fica sem vendedor.
- Avisa que não existe `PUT /users` (o vendedor não é atualizado pela API).

## Erros que reprovam

- Criar vendedor sem senha ou com senha fraca.
- Gravar o telefone com `+55` ou máscara.
- Excluir e recriar vendedores a cada sincronização (o e-mail de vendedor excluído não pode ser reusado).
