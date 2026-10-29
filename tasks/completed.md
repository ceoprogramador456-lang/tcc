# Completed (verificado no código — sem alterações)

- Auth dupla JWT (usuário) + X-Token (dispositivo) — `src/middlewares/auth.middleware.ts`, `docs/adr/0004-*`, `docs/AUTHENTICATION.md`.
- CRUD `users` (delete só `super_admin`) e CRUD `companies` (escrita `super_admin`) com isolamento cliente×cliente via `assertSameCompany` (`src/shared/auth/scope.ts:9`).
- CRUD `sectors` / `assets` / `devices` / `sensors` (escrita `super_admin` + `admin_empresa`).
- Ingestão `POST /readings` (X-Token) + listagem `GET /readings` (JWT).
- CRUD `maintenances` parcial (preventiva/inspeção avulsa, sem `authorize`, sem dono — travas pendentes em TASK-004).
- Envelope `/success` + paginação + erros padrão (`ZodError→422`, `AppError→status`, 500 sem stack em prod) — middlewares e controllers.
- `MOCK_MODE` (API em memória sem MySQL) — `src/config/env.ts`, repositories com `mockRepository`, `docs/adr/0005-*`.
- Docs base em `docs/` (`ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `BUSINESS_FLOWS.md`, etc.) + `docs/analise-regras-negocio.md` + `docs/backend-architecture.md`.
