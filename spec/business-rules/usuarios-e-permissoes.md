# Regra: Usuários e permissões (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,3 + implementação de 2026-11-26.
`tipo/perfil` = autorização; `cargo` = função operacional (nunca criar
mecânico/eletricista como tipo).

## Tipos implementados

- `ADMIN`: vinculado à SIVA (`empresaId = SIVA.id`), autorização global.
  Único perfil que cria/edita/exclui usuários e empresas. Sem especialidade.
- `GESTOR`: empresa cliente obrigatória. Opera o painel da própria empresa
  (setores, ativos, ESP32, sensores, manutenção interna e criação de OS).
  Sem especialidade.
- `TECNICO`: **exclusivo da SIVA**, especialidade `MECANICO|ELETRICISTA`
  obrigatória. Acessa somente as OS designadas a ele (`funcionarioId`).

## Cadastro de usuários (somente ADMIN)

| Empresa escolhida | Perfis permitidos | Especialidade |
| --- | --- | --- |
| SIVA (`tipo = SIVA`) | `ADMIN`, `TECNICO` | obrigatória apenas para `TECNICO` |
| Cliente (`tipo = CLIENTE`) | `GESTOR` | proibida |

- Todo usuário tem empresa (inclusive `ADMIN`, vinculado à SIVA).
- Combinação inválida → `422` com mensagem clara:
  - "A empresa SIVA aceita apenas os perfis ADMIN ou TECNICO."
  - "Empresas clientes aceitam apenas o perfil GESTOR."
  - "Técnico deve ter uma especialidade (MECANICO ou ELETRICISTA)."
- Não existe auto-registro público.

## Acesso do TECNICO

- Login redireciona para a área `/tecnico` (única tela: minhas ordens de serviço).
- Back-end: `denyTecnico` bloqueia users/companies/sectors/assets/devices/
  sensors/maintenances/alerts/dashboard/readings.
- `GET /api/solicitacoes-servico` filtra por `funcionarioId = usuário autenticado`.
- `GET /api/solicitacoes-servico/:id` só retorna a OS do próprio técnico; OS de
  outro técnico → `403`.

## Planejado

- `operador` (vendedora) como papel separado de `TECNICO`.
- `Usuario.cargo?` opcional, sem efeito em `authorize`.
