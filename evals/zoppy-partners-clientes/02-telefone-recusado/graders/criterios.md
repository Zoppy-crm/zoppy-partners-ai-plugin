---
type: llm
---

Avalie a resposta final do agente ao pedido do desenvolvedor.

PASS se a resposta cumpre todos os critérios de acerto abaixo e não comete nenhum dos erros que reprovam.
FAIL se falta qualquer critério de acerto ou se aparece qualquer erro que reprova.

## Critérios de acerto

- `"11 9876-543"`: recusado (422), porque não forma DDD + 8 ou 9 dígitos.
- `"5511987654321"`: aceito e gravado `11987654321` (sem 55).
- `"(21) 3456-7890"`: aceito como fixo e gravado `2134567890` (10 dígitos, sem o 9).
- `"+351 912 345 678"`: recusado (422). Explica que a API só entende telefone brasileiro e que um estrangeiro que caiba no formato seria lido como DDD brasileiro. Não sugere mandar estrangeiro.
- Trata o cliente sem telefone válido fora da integração (telefone é obrigatório).
- Lembra que o telefone é a chave que evita duplicata no `POST`.
