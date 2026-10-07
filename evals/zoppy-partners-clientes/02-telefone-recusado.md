# Eval 02: telefone recusado e telefone estrangeiro

## Pedido do desenvolvedor

> Meu POST /customers está voltando `{"message":"Phone invalid","statusCode":422}` para alguns clientes. Os telefones vêm como "11 9876-543", "+351 912 345 678", "5511987654321" e "(21) 3456-7890". Quais vão passar, como cada um fica gravado e o que eu faço com os que não passam?

## Critérios de acerto

- `"11 9876-543"`: recusado (422), porque não forma DDD + 8 ou 9 dígitos.
- `"5511987654321"`: aceito e gravado `11987654321` (sem 55).
- `"(21) 3456-7890"`: aceito como fixo e gravado `2134567890` (10 dígitos, sem o 9).
- `"+351 912 345 678"`: recusado (422). Explica que a API só entende telefone brasileiro e que um estrangeiro que caiba no formato seria lido como DDD brasileiro. Não sugere mandar estrangeiro.
- Sugere validar antes com `node scripts/validate.mjs --schema=cliente.create` e tratar o cliente sem telefone válido fora da integração (telefone é obrigatório).
- Lembra que o telefone é a chave que evita duplicata no `POST`.
