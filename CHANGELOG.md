# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). O projeto segue [SemVer](https://semver.org/) informalmente (ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#versionamento)) — enquanto estiver em `0.x`, mudanças incompatíveis podem acontecer entre versões menores.

## [0.1.0] — 2026-08-07

Primeira etapa do backend: fundação da arquitetura, sem implementação completa das regras de negócio de detecção de vazamento (ver "Próximas etapas" no [README](README.md)).

### Added

- Estrutura feature-modular em camadas (routes → controllers → services → repositories) para os módulos `auth`, `users`, `companies`, `sectors`, `assets`, `devices`, `sensors`, `readings`, `maintenances` e `alerts` (stub).
- Persistência via Prisma + MySQL, com schema espelhando `db/db.sql`.
- **Modo mock em memória** (`MOCK_MODE=true`) — a API inteira funciona sem MySQL, com dados de exemplo pré-populados, para o time de frontend desenvolver sem depender do backend estar de pé.
- Autenticação de usuário via JWT (`Authorization: Bearer`) e de dispositivo ESP32 via `X-Token`, com autorização por papel (`super_admin`/`admin_empresa`/`funcionario`) e escopo por empresa.
- Endpoint de ingestão de leituras (`POST /api/readings`) com validação cruzada `esp_id` ↔ token e `sensor_id` ↔ ESP32.
- Documentação OpenAPI/Swagger servida em runtime (`/docs`).
- Infraestrutura Docker: `Dockerfile` multi-stage, `docker-compose.yml` (dev, API+MySQL) e `docker-compose.enterprise.yml` (produção, com Caddy como reverse proxy).
- Pipeline de CI (GitHub Actions): lint, format check, typecheck, testes e build em todo push/PR.
- Husky + lint-staged no pre-commit.
- Suíte de testes de integração (Vitest + Supertest): healthcheck, login/JWT, escopo multi-tenant, ingestão via X-Token.
- Script `simulate:esp32` para testar a ingestão de leituras sem hardware.
- Documentação completa em `docs/` (arquitetura, banco de dados, fluxos de negócio, API, autenticação, segurança, tratamento de erros, observabilidade, testes, guia de desenvolvimento, deploy, runbook, ADRs), `CONTRIBUTING.md` e este `CHANGELOG.md`.

### Fixed

- `esp32.token` não tinha constraint `UNIQUE` — dois dispositivos com o mesmo token autenticariam um como o outro. Corrigido em `db.sql` e `schema.prisma`.

### Known issues

Ver checklist completo em [docs/SECURITY.md](docs/SECURITY.md#checklist-resumido). Os mais relevantes: `JWT_SECRET` tem um valor default inseguro e nada impede subir em produção sem trocá-lo; o token do ESP32 fica em texto plano no banco; não há rate limit específico para login; `trust proxy` não está configurado (relevante para a topologia com Caddy); erros inesperados de banco em `update`/`remove` são mascarados como `404`.

## [0.0.0] — 2026-07-29

Estado inicial do repositório, antes da arquitetura de backend: `README.md` do projeto (contexto do TCC, hardware, ODS) e `db/db.sql` (schema do banco desenhado à mão).
