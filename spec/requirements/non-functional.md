# Requisitos não funcionais

Somente o definido em `docs/` + `.env.example`. Sem inventar metas numéricas
não documentadas.

## Segurança

- JWT stateless (`JWT_SECRET`, `JWT_EXPIRES_IN=8h`); sem revogação/logout backend.
- Senhas `bcryptjs` 10 rounds; `senha` removida das respostas (`toPublicUser`).
- Validação Zod em body/params/query de todas as rotas; Prisma parametriza (baixo
  risco SQLi). Detalhe: `docs/SECURITY.md`, `docs/AUTHENTICATION.md`.
- Gaps conhecidos: sem limite específico p/ login, sem `trust proxy` (rate limit
  atrás de proxy), token de dispositivo sem hash, `JWT_SECRET` não obrigatório.
  Ver `docs/SECURITY.md`.

## Desempenho

- Índice `idx_leitura_sensor_data (sensor_id, registrado_em)` e
  `idx_manutencao_status`. Paginação padrão nos lists. Sem metas de latência
  definidas. Ver `docs/DATABASE.md`.

## Disponibilidade

- Health check `GET /api/health`. Runbook de operação em `docs/RUNBOOK.md`.
- Monólito de processo único; sem HA/failover definidos.

## Escalabilidade

- Monólito modular; sem filas, workers ou microsserviços nesta etapa.
  `src/jobs/` reservado, nenhuma tarefa implementada.

## Manutenibilidade

- Feature-modular `src/modules/<recurso>/{controllers,services,repositories,
  routes,entities,dtos,validators}`; contrato `CrudRepository`; `MOCK_MODE=true`
  roda sem MySQL. Qualidade: ESLint+Prettier+Husky, Vitest+Supertest.
  Ver `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/DEVELOPMENT.md`.

## Isolamento (multi-tenancy)

- `assertSameCompany` (cliente×cliente) + `authorize` por papel; deny-by-default
  (`?? -1`). Vendedora×cliente PLANEJADO. Ver `spec/architecture/multi-tenancy.md`.

## Auth / Rastreabilidade

- Auth dupla: JWT (`Authorization: Bearer`) p/ usuários; `X-Token` p/ ESP32
  (só `POST /readings`). Logs estruturados Pino (`LOG_LEVEL`), sem
  senha/token. Sem tracing/métricas. Ver `docs/OBSERVABILITY.md`.

## Configuração (env)

`NODE_ENV`, `PORT=3000`, `MOCK_MODE`, `DATABASE_URL`, `JWT_SECRET`,
`JWT_EXPIRES_IN`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS/MAX`, `LOG_LEVEL`.
Ref.: `.env.example`, `docs/DEPLOYMENT.md`.
