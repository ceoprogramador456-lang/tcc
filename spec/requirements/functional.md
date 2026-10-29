# Requisitos funcionais

Verificado contra `src/modules/*` + `prisma/schema.prisma`. Status:
IMPLEMENTADO = rota+service+repository+tabela; PARCIAL = existe com gaps;
PLANEJADO = sem código/tabela.

## IMPLEMENTADO

- **RF01 Autenticação de usuários**: `POST /auth/login` (e-mail+senha→JWT),
  `GET /auth/me`. Módulo `auth`. Detalhe: `docs/AUTHENTICATION.md`.
- **RF02 Gestão de usuários**: CRUD `/users`; delete só `super_admin`.
  Entidade `Usuario`. Módulo `users`.
- **RF03 Gestão de empresas**: CRUD `/companies`; escrita só `super_admin`.
  Entidade `Empresa`. Módulo `companies`.
- **RF04 Gestão de setores**: CRUD `/sectors` (escrita super_admin+admin_empresa).
  Entidade `Setor`. Módulo `sectors`.
- **RF05 Gestão de ativos**: CRUD `/assets`. Entidade `Ativo`. Módulo `assets`.
- **RF06 Gestão de ESP32**: CRUD `/devices`; create retorna token. Entidade `Esp32`.
  Módulo `devices`.
- **RF07 Gestão de sensores**: CRUD `/sensors`. Entidade `Sensor`. Módulo `sensors`.
- **RF08 Ingestão de leituras**: `POST /readings` via `X-Token` (imutável, atualiza
  `ultimo_contato`). **RF09 Consulta de leituras**: `GET /readings` (JWT).
  Entidade `Leitura`. Módulo `readings`.

## PARCIAL

- **RF10 Manutenções internas**: CRUD `/maintenances` existe, mas sem `authorize`
  (qualquer usuário autenticado escreve) e sem trava de dono
  (`funcionarioId` de outro). Falta agenda, checklist, filtros globais.
  Ver `spec/business-rules/manutencao.md`.

## PLANEJADO

- **RF11 Alertas**: `GET /alerts` stub 501, sem entidade/tabela.
- **RF12 Chamados**: sem entidade, rota ou tabela (só string legada em
  `maintenance.service.ts`). Ver `spec/business-rules/chamados.md`.
- **RF13 Ordens de Serviço**: sem código (`grep OrdemServico` = 0).
  Ver `spec/business-rules/ordens-servico.md`.
