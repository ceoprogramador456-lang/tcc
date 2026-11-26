# Project State

Data: 2026-11-26 (técnico exclusivo da SIVA + cadastro de usuários por empresa)

## Sessão 2026-11-26 — TECNICO exclusivo da SIVA (ver `memory/sessions/2026-11-26.md`)

1. `Empresa.tipo` (`SIVA|CLIENTE`) + migration/seed garantindo a SIVA
   (CNPJ reservado `00.000.000/0001-00`); `ADMIN` vinculado à SIVA.
2. Técnicos legados de empresas clientes migrados para a SIVA (histórico preservado).
3. Cadastro de usuários dinâmico: SIVA → `ADMIN|TECNICO` (técnico com
   especialidade); cliente → somente `GESTOR`; backend valida e retorna 422 claro.
4. `TECNICO` só lista/abre OS em que é `funcionarioId`; aceitar/concluir/alterar
   funcionário é exclusivo do `ADMIN`; criação de OS é exclusiva do `GESTOR`.
5. `denyTecnico` bloqueia o técnico em users/companies/sectors/assets/devices/
   sensors/maintenances/alerts/dashboard/readings.
6. Front-end: formulário de usuário dinâmico, badge/proteção da SIVA e área
   `/tecnico` (única tela: minhas ordens de serviço) com redirecionamento no login.
7. Validação: backend `typecheck` + 91 testes OK; frontend `build` + `lint` OK.

## Sessão 2026-10-21 — front-end do zero (ver `memory/sessions/2026-10-21.md`)

1. `siva-frontend/` criado do zero (Vite 8 + React 19 + TS 6 + Tailwind 4 + Router 7 + Motion).
   Back-end **não** foi alterado — só lido e testado ao vivo em `MOCK_MODE`.
2. Página inicial pública (7 seções) + tela de login **conectada ao endpoint real**
   `POST /api/auth/login`; sessão JWT stateless revalidada via `GET /api/auth/me`.
3. Área `/admin` (ADMIN): Dashboard, Empresas (+detalhes), Usuários, Sensores —
   CRUD completo, filtros, paginação, inativação de usuário, cascata empresa→setor→ativo/ESP32.
4. Paleta oficial como tokens no `@theme` do Tailwind 4; tipografia Inter+Manrope preservada.
5. Estado de sessão em `localStorage`; guard de rota no front **apenas como UX** (autorização
   real permanece no back-end).
6. Validação: build + lint 0 avisos; E2E Chromium contra a API real — **85/86** (a única
   não-aprovação é o log de rede do 401 usado de propósito no teste).

## Sessão 2026-10-13 — implementação completa (ver `memory/sessions/2026-10-13.md`)

1. Análise read-only inicial → `RELATORIO_BACKEND_FRONTEND.md` (estrutura, banco, auth, 40+ endpoints).
2. Leitura de `ai.md` — mentalidade ENTENDER→…→REVISAR assumida.
3. Migração de roles: `super_admin→ADMIN`, `admin_empresa→GESTOR`, `funcionario→TECNICO`
   (+`especialidade` obrigatória p/ TECNICO, +`status ATIVO|INATIVO`, INATIVO não loga).
4. Novos endpoints: `PATCH /users/:id/status`, `GET /companies/:id/details`,
   `GET /companies/:id/users`, `GET /dashboard/admin-summary`.
5. Endurecimento: `POST/PATCH/DELETE /users` só ADMIN; `DELETE`/`remove` com 409 em vínculos;
   `funcionarioId` validado na manutenção; Prisma `P2002/P2003→409`, `P2025→404`;
   `paginated()` + `totalPages`; filtros `?empresaId=&tipo=&status=`.
6. Docs + Swagger + relatório final atualizados. Validação: typecheck/build OK, lint 0 erros, 39/39 testes.

## Sessão 2026-09-23 — histórico completo (consolidado anterior)

1. Lido `ai.md` — mentalidade Senior Backend SIVA (clareza→segurança→manutenibilidade→escalabilidade→performance; fluxo requisito→análise→planejamento→implementação→validação→testes→revisão).
2. Análise da estrutura do sistema + divergência MySQL real × PostgreSQL do `ai.md`.
3. Lido `opneai.md` (arquivo com erro de digitação; seria `openai.md`) — spec para gerar `docs/backend-architecture.md`; terminava truncado em `Expliq`.
4. Gerado `docs/backend-architecture.md` (visão, stack, camadas, 8 entidades, 3 perfis, rotas, gaps, riscos).
5. Gerado `docs/backend-functionalities.json` (13 funcionalidades separadas; validado `JSON OK`).
6. Análise somente-leitura das regras vendedora×cliente → gerado `docs/analise-regras-negocio.md` (22 seções; sem tocar código).
7. Consolidação definitiva: MANUTENÇÃO INTERNA = funcionário + preventiva/inspeção; ATENDIMENTO = cliente + Chamado + operador + OS; sem `Manutencao.alvo`; cargo≠perfil.
8. Executado `separação.md` (Engenharia de Contexto): criados `AI.md` + `spec/` (31) + `decisions/` (ADR-006–009) + `tasks/` (3) + `memory/` (4). Apagados `separação.md` e `opneai.md` após consolidação.

## Implementado (código) — atualizado 2026-11-26

### Back-end
- Auth dupla: JWT (usuários) + X-Token (ESP32). INATIVO bloqueado no login e `/me` (403).
- Roles: `ADMIN` (global, vinculado à SIVA) / `GESTOR` (empresa cliente) /
  `TECNICO` (exclusivo da SIVA + `MECANICO|ELETRICISTA`).
- `Empresa.tipo` (`SIVA|CLIENTE`); empresas criadas pela API nascem `CLIENTE`;
  SIVA protegida contra edição/exclusão.
- Cadastro de usuários: SIVA → `ADMIN|TECNICO`; cliente → `GESTOR`; todo usuário
  tem empresa; técnico exige especialidade.
- Ordens de serviço: `GESTOR` cria; `ADMIN` aceita/conclui/altera técnico;
  `TECNICO` lista e abre somente as próprias OS.
- `denyTecnico` bloqueia o técnico nos demais módulos; manutenção interna
  executada por `GESTOR` da empresa do sensor.
- Status `ATIVO|INATIVO` + `PATCH /users/:id/status` (só ADMIN); escrita de users só ADMIN.
- CRUDs: users, companies (+`/:id/details`, `/:id/users`), sectors, assets, devices, sensors;
  readings imutável; maintenances com `funcionarioId` validado (ATIVO + GESTOR da empresa).
- Dashboard admin com contadores reais; envelope `{success,data,meta+totalPages}`; erros
  Prisma mapeados (409/404); MOCK_MODE; Swagger `/docs` atualizado.

### Front-end (`siva-frontend/`)
- Landing pública + login ligados à API real (sem mock, sem resposta simulada).
- Área `/admin` (ADMIN): dashboard, empresas, usuários, sensores e solicitações —
  com CRUD, filtros, paginação, confirmações de exclusão e tratamento de 409/422.
- Formulário de usuário dinâmico por empresa (SIVA × cliente), com especialidade
  apenas para técnico da SIVA.
- Área `/painel` (GESTOR): visão geral, setores, ativos, dispositivos, sensores,
  solicitações e equipe.
- Área `/tecnico` (TECNICO): única tela com as OS designadas ao usuário, filtro de
  status e detalhe somente leitura; sem menu para outras rotas.
- Camadas: `types/` (contratos espelhando o back-end) → `services/` (cliente HTTP + um
  service por recurso) → `features/` (auth, landing, admin, panel, tecnico) → `pages/`
  → `components/ui/`.
- Áreas carregadas em `React.lazy`; sessão em `localStorage` (`siva.auth.session`),
  revalidada no boot via `/auth/me`; 429 tratado com mensagem própria.

## Parcial (atualizado 2026-11-26)

- `maintenances` tem `authorize` (ADMIN/GESTOR) e exige executor `GESTOR` da empresa
  do sensor; não há mais técnico executando manutenção interna — PROB-001 resolvido.
- Isolamento multiempresa por `empresaId`; o técnico da SIVA é escopado por
  `funcionarioId` nas OS. Vendedora×clientes segue ausente (PROB-002/003).
- JWT stateless sem revogação: token de usuário inativado vale até expirar (PROB-006 parcial).
- Migrations Prisma + `db.sql` convivem; Prisma Migrate ainda não é fonte única (PROB-007 parcial).
- Front-end cobre ADMIN (`/admin`), GESTOR (`/painel`) e TECNICO (`/tecnico`).
- Identidade visual do front reconstruída da especificação textual: **as imagens de
  referência nunca chegaram ao ambiente** — falta conferência pixel a pixel.

## Planejado

- `operador`, `cargo` (+ vínculo operador×clientes) — TASK-001.
- `Chamado` como entidade própria (a OS já existe implementada) — TASK-002/003.
- Hardening token/JWT/migration, P3 (agenda, checklist, alertas, dashboard).
- Front-end: refresh token, tema claro/escuro, envio de e-mail transacional
  (recuperação de senha).

## Documentação de contexto (fonte de verdade)

- Contrato: `AI.md` (agente) + `ai.md` (regras backend) + `siva-frontend/ai.md` (regras front).
- Esperado: `spec/` (produto, requisitos, 10 domínios, 6 regras, 6 use-cases, 6 arquitetura).
- Decisões: `docs/adr/0001-0005` (base) + `decisions/ADR-006–010` (negócio).
- Detalhe técnico: `docs/` + `docs/backend-architecture.md` + `docs/analise-regras-negocio.md`.
- Front-end: `siva-frontend/README.md` (rotas, contrato de auth, endpoints consumidos, regras
  replicadas, credenciais de teste, observações de operação).
- Trabalho: `tasks/` (backlog TASK-001–008, current, completed).
- Memória: `memory/` (este arquivo, problems, pending, sessions/).

## Próximo passo

- Back-end: decidir escopo do operador (todas vs atribuídas — ver `memory/pending.md`) e
  implementar TASK-001; avaliar incluir o nome da empresa nas respostas de OS para a área
  do técnico.
- Front-end: fechar a conferência visual com as imagens de referência.
