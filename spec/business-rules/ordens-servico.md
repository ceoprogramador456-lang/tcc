# Regra: Ordens de Serviço (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,10 + implementação de 2026-11-26.
**Status: IMPLEMENTADO.**

`OS = atendimento técnico da SIVA vinculado a uma solicitação da empresa cliente.`

## Fluxo e permissões

- `GESTOR` da empresa cliente cria a OS (empresa e solicitante derivados do
  ator autenticado; status inicial `aberto`).
- `ADMIN` aceita a OS e designa um `TECNICO` ativo da SIVA → `em_andamento`,
  registrando `aceitoPor`/`aceitoEm`.
- `ADMIN` conclui uma OS em andamento → `concluido` + `concluidoEm`.
- `ADMIN` pode trocar o funcionário responsável enquanto a OS está `aberto` ou
  `em_andamento`.
- `TECNICO` lista e visualiza somente as OS em que é o `funcionarioId`.
- `TECNICO` não cria, aceita, conclui nem altera o responsável (`403`).
- Transições inválidas → `422`; OS de outro técnico → `403`.

## Regras de dados

- `funcionarioId` deve referenciar um usuário `TECNICO`, `ATIVO`, de empresa `SIVA`.
- O `TECNICO` nunca é escopado por `empresaId`: o vínculo com a OS é o
  `funcionarioId` (ele atende empresas clientes diferentes).
- `Chamado` como entidade própria segue planejado; a OS atual não exige chamado.
