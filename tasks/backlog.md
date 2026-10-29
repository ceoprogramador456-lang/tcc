# Backlog — SIVA (modelagem consolidada)

Base: `docs/analise-regras-negocio.md` §§20, 22. Tudo abaixo é PLANEJADO (não existe no código) salvo indicação [EXISTENTE] em Referências. Decisões de modelagem: `decisions/ADR-006` a `ADR-009` (complementam `docs/adr/0001-0005`, sem duplicá-los).

## TASK-001 — `operador` + `cargo` + `Empresa.tipo` (+ vínculo operador×clientes)

- **Objetivo:** Criar a base de papéis e tipos de empresa: estender `TipoUsuario` com `operador`, adicionar `Usuario.cargo?` (opcional, sem efeito em `authorize`) e `Empresa.tipo` (`vendedora|cliente`).
- **Status:** Backlog — BLOQUEADO aguardando decisão pendente de escopo do operador (`todas` vs `atribuídas`, ver `decisions/ADR-007`, `memory/pending.md`).
- **Referências:** analise §§3, 4, 5, 6, 20-P1, 22; `decisions/ADR-006`, `ADR-007`; `prisma/schema.prisma:14-20`; `src/types/express.d.ts:7`.
- **Critérios de aceite:**
  - [ ] Migration cria `operador` em `TipoUsuario`, `Usuario.cargo String?`, `Empresa.tipo` com default compatível com dados existentes.
  - [ ] `express.d.ts` + validators + OpenAPI reconhecem `operador` e `cargo`.
  - [ ] `cargo` não altera nenhum `authorize()` (teste: mecânico/eletricista têm exatamente as permissões de `funcionario`).
  - [ ] Se escopo `atribuídas`: tabela de vínculo + escopo + filtros; se `todas`: bypass seletivo documentado.

## TASK-002 — Entidade `Chamado` + rotas + escopo

- **Objetivo:** Implementar a solicitação da cliente (problema/necessidade) com rotas `/chamados`, `authorize` e isolamento por empresa/escopo do operador.
- **Status:** Backlog (PLANEJADO — hoje só existe a string `'Chamado de manutenção'`).
- **Referências:** analise §§9, 12, 20-P1, 22; `decisions/ADR-009`; `src/modules/maintenances/services/maintenance.service.ts:18,31` (string a renomear).
- **Critérios de aceite:**
  - [ ] CRUD mínimo com campos do §9 (`empresaId, solicitanteId, titulo, descricao, prioridade, status, timestamps`, + FKs opcionais).
  - [ ] Máquina de estado `aberto→em_analise→em_atendimento→concluído/cancelado` guardada no service; transições inválidas retornam 422.
  - [ ] Cliente vê só os próprios; operador vê o escopo (TASK-001); `super_admin` tudo.
  - [ ] Quem pode abrir (gestor × funcionário) conforme decisão pendente (`memory/pending.md`).

## TASK-003 — Entidade `OrdemServico` + fluxo Chamado→OS

- **Objetivo:** Implementar a execução da vendedora vinculada ao chamado: gerar OS a partir do chamado, executar, registrar serviço/laudo, concluir (e fechar chamado).
- **Status:** Backlog (PLANEJADO — `grep OrdemServico` = 0).
- **Referências:** analise §§10, 11-Fluxo 3, 12, 20-P1, 22; `decisions/ADR-009`.
- **Critérios de aceite:**
  - [ ] OS com `chamadoId, operadorId, descricao_servico, status, iniciadoEm, concluidoEm, laudo/servicoRealizado, custo?`.
  - [ ] Só `operador/super_admin` criam/assumem/executam/concluem; cliente só visualiza as próprias.
  - [ ] Cardinalidade Chamado×OS e OS-sem-chamado conforme decisão pendente (`memory/pending.md`).
  - [ ] Concluir OS atualiza o chamado vinculado (regra de fechamento definida e testada).

## TASK-004 — Travas em `maintenances` (dono + papel + FK + filtros)

- **Objetivo:** Corrigir o módulo sem `authorize` e sem dono: só dono/funcionário atribuído ou gestor alteram; `funcionarioId` validado na mesma empresa; filtros globais; renomear "Chamado de manutenção".
- **Status:** Backlog (código atual [EXISTENTE] parcial, sem travas).
- **Referências:** analise §§5, 7, 13, 20-P1, 22; `decisions/ADR-008`; `src/modules/maintenances/*` (routes sem `authorize`).
- **Critérios de aceite:**
  - [ ] `authorize` nas rotas de escrita; funcionário só altera/conclui as próprias; gestor da mesma empresa gerencia.
  - [ ] `funcionarioId` inexistente ou de outra empresa → 422/403, sem vazamento entre empresas.
  - [ ] Filtros globais (por empresa/setor/status) para gestor; string `'Chamado de manutenção'` renomeada.
  - [ ] Testes de isolamento: funcionário A não conclui atividade de B.

## TASK-005 — `company.service` com actor + revalidação de FK destino em updates

- **Objetivo:** Mover a defesa da rota para o service (`actor` explícito em create/update/remove de empresas) e revalidar FK de destino em `update` para impedir mover registro de empresa.
- **Status:** Backlog (defesa hoje só na rota — `company.service.ts:23-35`).
- **Referências:** analise §§13, 20-P2, 22.
- **Critérios de aceite:**
  - [ ] `company.service` recebe `actor` em todas as escritas; sem `actor` não escreve (deny-by-default testado).
  - [ ] `update` com FK de outra empresa é rejeitado (403/422) em todos os módulos com `empresaId` indireta.
  - [ ] Nenhuma rota perde a proteção atual (regressão coberta por teste).

## TASK-006 — Hardening de token/JWT

- **Objetivo:** `device.token` hasheado (hoje texto plano), `JWT_SECRET` obrigatório em produção, revalidação JWT em pontos críticos.
- **Status:** Backlog.
- **Referências:** analise §§13, 20-P2, 22; `docs/adr/0004-*` (contexto JWT+X-Token); `docs/SECURITY.md`; `src/middlewares/auth.middleware.ts:46`.
- **Critérios de aceite:**
  - [ ] Token de dispositivo armazenado como hash; `POST /readings` (X-Token) continua funcionando após migração/rotatividade definida.
  - [ ] Boot em `NODE_ENV=production` sem `JWT_SECRET` falha explicitamente.
  - [ ] Revogação/revalidação crítica definida (limitação do JWT stateless documentada; comportamento testado).

## TASK-007 — Índices, `updatedAt`/`onDelete`, migration inicial, unificação `db.sql`

- **Objetivo:** Alinhar banco físico ao modelo: índices das FKs quentes, `updatedAt`/`onDelete` definidos, migration inicial versionada, `db.sql` × Prisma com fonte da verdade única.
- **Status:** Backlog.
- **Referências:** analise §§14, 20-P2, 21 (MySQL×Postgres, `db.sql`×Prisma), 22; `docs/adr/0002-*`; `docs/DATABASE.md`.
- **Critérios de aceite:**
  - [ ] Migration inicial aplica do zero em banco vazio (teste em CI ou script documentado).
  - [ ] Decisão MySQL×Postgres e `db.sql`×Prisma registrada (ver `memory/pending.md`).
  - [ ] Índices em FKs/colunas de filtro (leituras por sensor/tempo, chamados por empresa/status) com justificativa.

## TASK-008 — P3: agenda/recorrência, checklist/evidências, alertas→ocorrência, dashboard operador

- **Objetivo:** Camada futura pós-essencial: preventivas recorrentes, checklist e evidências na manutenção interna, motor de alertas gerando ocorrências (hoje `GET /alerts` = 501), agregações e dashboard do operador.
- **Status:** Backlog (PLANEJADO — explicitamente futuro/P3).
- **Referências:** analise §§7, 11-Fluxo 3, 20-P3, 22; `src/modules/*alert*` (stub 501).
- **Critérios de aceite:**
  - [ ] Escopo fatiado em subtarefas antes de implementar (agenda ≠ checklist ≠ alertas ≠ dashboard).
  - [ ] Alertas→ocorrência com regra de geração e deduplicação definidas e testadas.
  - [ ] Dashboard do operador consome apenas escopo autorizado (TASK-001/TASK-002).
