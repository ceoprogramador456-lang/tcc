# SIVA — Arquitetura do Backend

> Documento central de arquitetura. Gerado a partir da análise do código existente em `src/`, `prisma/schema.prisma`, `package.json`, `Dockerfile`, `docker-compose.yml` e `docs/`.
> Convenções: `[EXISTENTE]`, `[NECESSÁRIO IMPLEMENTAR]`, `[NECESSITA DEFINIÇÃO]`.
> Regra: não inventar regra de negócio — o que não está no código está marcado.

---

## 1. Visão geral [EXISTENTE]

SIVA = Sistema Inteligente de Vazão de Água. Monitoramento industrial de água com sensores de fluxo YF-S201 + ESP32 que enviam vazão em tempo real para API Node que persiste e expõe para dashboard web.

Fluxo físico:

```text
Sensor YF-S201 → ESP32 (+ OLED SSD1306) → POST /api/readings (X-Token) → API Express → MySQL via Prisma → Dashboard (GET /api/readings + JWT)
```

Hierarquia real (confirmada em `prisma/schema.prisma`):

```text
Empresa
 ↓
Setor (empresaId)
 ↓
Ativo (setorId) | ESP32 (setorId)
 ↓                ↓
 └──── Sensor (ativoId + esp32Id) ────┘
         ↓
   Leitura (sensorId, vazao, registradoEm)
   Manutencao (sensorId, tipo, status, funcionarioId)
```

Divergência conhecida: `ai.md` / `opneai.md` citam PostgreSQL, implementação real é **MySQL 8** (`datasource db provider = "mysql"`). Manter MySQL salvo decisão explícita de migração. `prisma/schema.prisma` declara espelhar `db/db.sql` — qualquer mudança deve ir nos dois até unificar fonte da verdade no Prisma Migrate.

---

## 2. Stack [EXISTENTE]

- Node >= 22, TypeScript strict ESM (`package.json`, `tsconfig.json`).
- Express 5, Zod (validação), Prisma 6.
- Auth: `jsonwebtoken` + `bcryptjs`.
- Infra HTTP: `helmet` + CSP, `cors`, `compression`, `express-rate-limit`, `pino` + `pino-pretty`.
- Docs runtime: `swagger-ui-dist` em `/docs` (`src/docs/`).
- Qualidade: ESLint + Prettier + Husky + lint-staged, Vitest + Supertest.
- `MOCK_MODE=true`: roda 100% em memória (`src/shared/mock/`) sem MySQL — para frontend/dev.
- Docker multi-stage `node:22-alpine` (`Dockerfile`): `deps → build (prisma generate + tsc) → runtime (USER node, CMD node dist/server.js)`.
- Compose dev (`docker-compose.yml`): `mysql:8.4` + `api (migrate deploy && npm run dev)`. Compose enterprise (`docker-compose.enterprise.yml`): MySQL + api runtime + Caddy TLS (`Caddyfile`).

Variáveis (`src/config/env.ts` via Zod, nunca `process.env` espalhado): `NODE_ENV`, `PORT=3000`, `MOCK_MODE=false`, `DATABASE_URL` (obrigatória se `!MOCK`), `JWT_SECRET` (default inseguro — trocar em prod), `JWT_EXPIRES_IN=8h`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS/MAX=60s/100`, `LOG_LEVEL=info`.

---

## 3. Arquitetura de camadas [EXISTENTE]

Fluxo aplicado em todos os módulos:

```text
HTTP Request
 ↓
Route (src/modules/<recurso>/routes/)
 ↓
Middleware (auth → authorize → validate)
 ↓
Controller (src/modules/<recurso>/controllers/ — só HTTP in/out)
 ↓
Service (src/modules/<recurso>/services/ — regra de negócio)
 ↓
Repository (src/modules/<recurso>/repositories/ — Prisma ou mock)
 ↓
Prisma (src/database/prisma.ts singleton; não instancia em MOCK)
 ↓
MySQL
```

- Controller: fino, usa `asyncHandler` (`src/utils/async-handler.ts`), responde via `ok/created/noContent/paginated` (`src/shared/http/api-response.ts`). Envelope `{ success, data, meta? }`.
- Service: regra + `assertSameCompany` (`src/shared/auth/scope.ts`).
- Repository: abstrai persistência, dual Prisma/mock via `create-mock-repository`. Evita `prisma.*` espalhado.
- Erros centralizados (`src/shared/errors/app-error.ts` + `src/middlewares/error-handler.middleware.ts`): `ZodError → 422`, `AppError → statusCode`, resto `500` sem stack em prod.
- Validação (`src/middlewares/validate.middleware.ts`): Zod para `body/params/query` antes do service.
- Logs (`src/middlewares/request-logger.middleware.ts` + `src/utils/logger.ts`): `X-Request-Id`, pino child `req.log`, nunca senha/token.
- `GET /api/health` [EXISTENTE] — `{ status: ok, mockMode, env }`.
- `src/jobs/` vazio (só README) [NECESSÁRIO IMPLEMENTAR] se precisar de agendamentos (ex: agregação de consumo, varredura de alertas).

---

## 4. Entidades e relacionamentos [EXISTENTE]

Fonte: `prisma/schema.prisma`. Tipos TS inferidos do Prisma, sem duplicação.

| Entidade | Campos principais | Relações |
|---|---|---|
| Empresa | `id, nome, cnpj? unique` | 1—N Usuario, Setor |
| Usuario | `id, nome, email unique, senha bcrypt, tipo: super_admin\|admin_empresa\|funcionario, empresaId?` | N—1 Empresa (nullable só p/ super_admin), 1—N Manutencao |
| Setor | `id, empresaId, nome` | N—1 Empresa, 1—N Ativo, Esp32 |
| Ativo | `id, setorId, nome, tag? unique, tipo?, criticidade: baixa\|media\|alta=media, centroCusto?, fotoUrl?, manualUrl?, descricao?` | N—1 Setor, 1—N Sensor |
| Esp32 (Device) | `id, setorId, espId unique, token unique texto plano, descricao?, ultimoContato?` | N—1 Setor, 1—N Sensor |
| Sensor | `id, ativoId, esp32Id, sensorId (id do payload), tag? unique, descricao?, ativoStatus=true` + `@@unique([esp32Id, sensorId])` | N—1 Ativo, N—1 Esp32, 1—N Leitura, Manutencao |
| Leitura | `id BigInt PK, sensorId, vazao Float L/min, registradoEm` + `idx_leitura_sensor_data(sensorId, registradoEm)` | N—1 Sensor. Maior volume. Serializada via `src/utils/bigint-json.ts` |
| Manutencao | `id, sensorId, tipo: preventiva\|corretiva\|inspecao, status: aberto\|em_andamento\|concluido=aberto, descricao? Text, funcionarioId?, abertoEm, concluidoEm?` + `idx_manutencao_status` | N—1 Sensor, N—1 Usuario |

Sem tabela de alerta, chamado ou OS. Sem `prisma/migrations/` versionada — primeira migration ainda a criar via `prisma migrate dev`.

---

## 5. Perfis de usuário [EXISTENTE]

Fonte: `TipoUsuario` + `authorize()` nas rotas + `assertSameCompany` nos services.

| Perfil | Empresa | Responsabilidade | Permissões reais |
|---|---|---|---|
| `super_admin` | nenhuma (`empresaId=null`) | Administração global | [EXISTENTE] CRUD empresas; CRUD setores/ativos/devices/sensores cross-empresa; criar qualquer usuário; único que pode `DELETE /users/:id` |
| `admin_empresa` | própria empresa | Gestão da empresa cliente | [EXISTENTE] Leitura empresas; CRUD setor/ativo/device/sensor da própria empresa; CRUD usuários da própria empresa exceto deletar; sem acesso a outra empresa (403) |
| `funcionario` | própria empresa | Operação | [EXISTENTE] Leitura geral escopada; criar/atualizar manutenções; sem escrita em empresas/setores/ativos/devices/sensores/users |

Sem papéis `Operador`/`Gestor`/`Admin` genéricos do `opneai.md` — adaptar nomenclatura ou mapear: Operador fornecedora ≈ `super_admin` [NECESSITA DEFINIÇÃO].

---

## 6. Contexto multi-empresa [EXISTENTE]

- Isolamento: `assertSameCompany(user, empresaId)` — `super_admin` bypassa, demais só `user.empresaId === recurso.empresaId`, senão `403`.
- Recursos sem `empresaId` direto (ativo/device/sensor/leitura/manutencao) sobem a cadeia até `setor.empresaId` no service.
- Usuário × empresa: `Usuario.empresaId? → Empresa`.
- Acesso operador fornecedora / gestor / funcionário: operador = `super_admin` global; gestor ≈ `admin_empresa`; funcionário = `funcionario`. [NECESSITA DEFINIÇÃO] se Operador deve ter escopo restrito diferente de `super_admin`.

---

## 7. Autenticação e autorização [EXISTENTE]

Duas autenticações separadas, nunca misturadas (`src/middlewares/auth.middleware.ts`):

- Dashboard (humanos): `Authorization: Bearer <JWT>`.
  - `POST /api/auth/login {email, senha}` público → `bcrypt.compare` → `{ token, user }`. HS256, `JWT_SECRET`/`JWT_EXPIRES_IN`.
  - `GET /api/auth/me` retorna perfil.
  - `authenticateUser`: valida o JWT e relê status, papel e empresa no banco por requisição; token inválido/ausente ou usuário removido → `401`, usuário inativo → `403`. Sem refresh, blacklist geral ou logout no servidor.
- Firmware (ESP32): `X-Token: <token>`, só em `POST /api/readings`.
  - `authenticateDevice` → `findByToken` → `req.device {id, espId, setorId}`. Token gerado no `POST /api/devices`, exibido só nessa resposta, sem expiração, armazenado em texto plano [NECESSITA DEFINIÇÃO — ideal hash]. `esp_id` do body deve igualar dono do token senão `403`; `sensor_id` inexistente → `404`. Cada ingestão faz `touchContact` (`ultimoContato=now`).
- Autorização: `authorize(...tipos)` na rota + escopo por empresa no service. Sem auto-registro (só admin cria usuário), sem reset por e-mail/MFA [NECESSÁRIO IMPLEMENTAR] se exigido.

---

## 8. Mapa de módulos: controllers / services / repositories [EXISTENTE]

Padrão interno por módulo: `routes/ controllers/ services/ repositories/ validators/ (+ dtos/entities onde há)`. Todos seguem `Controller → Service → Repository`.

- `auth/`: `auth.controller {login, me}`, `auth.service {login bcrypt+jwt, me}`, `auth.repository {findByEmail}`, `auth.validators {loginSchema}`.
- `users/`: `user.controller {list, getById, create, update, remove}`, `user.service` (hash bcrypt, escopo empresa, impede `funcionario` criar admin [verificar regra exata no service]), `user.repository`, `user.validators`.
- `companies/`: `company.controller/service/repository` CRUD empresa. Escrita só `super_admin`.
- `sectors/`: `sector.controller/service/repository` CRUD setor (`empresaId, nome`).
- `assets/`: `asset.controller/service/repository` CRUD ativo (`setorId, nome, tag, tipo, criticidade, centroCusto, fotoUrl, manualUrl, descricao`).
- `devices/`: `device.controller/service/repository` CRUD ESP32 (`setorId, espId, descricao`) + `findByToken/touchContact`.
- `sensors/`: `sensor.controller/service/repository` CRUD sensor (`ativoId, esp32Id, sensorId, tag, descricao, ativoStatus`) + `findByDeviceAndSensorId`.
- `readings/`: `reading.controller {ingest, list}`, `reading.service {ingest valida esp_id, resolve sensor, cria leitura; list checa acesso via sensorService}`, `reading.repository`, sem update/delete.
- `maintenances/`: `maintenance.controller/service/repository` CRUD manutenção sem `authorize` na rota (autorização por escopo no service).
- `alerts/`: `alert.controller {list}`, `alert.service {list → throw NotImplementedError 501}`, `alert.repository` + validators vazios. [NECESSÁRIO IMPLEMENTAR] detecção real.

---

## 9. Mapa de rotas

Prefixo global `/api` (`src/app.ts` + `src/routes/index.ts`). Todas exceto `POST /auth/login` e `POST /readings` usam JWT.

| Método | Endpoint | Auth | Perfil | Funcionalidade | Status |
|---|---|---|---|---|---|
| GET | `/api/health` | não | público | health + mockMode | [EXISTENTE] |
| POST | `/api/auth/login` | não | público | login → JWT | [EXISTENTE] |
| GET | `/api/auth/me` | JWT | qualquer | perfil | [EXISTENTE] |
| GET | `/api/users` | JWT | super_admin, admin_empresa | listar usuários | [EXISTENTE] |
| GET | `/api/users/:id` | JWT | super_admin, admin_empresa | detalhe | [EXISTENTE] |
| POST | `/api/users` | JWT | super_admin, admin_empresa | criar (sem auto-registro) | [EXISTENTE] |
| PATCH | `/api/users/:id` | JWT | super_admin, admin_empresa | atualizar | [EXISTENTE] |
| DELETE | `/api/users/:id` | JWT | super_admin | excluir | [EXISTENTE] |
| GET | `/api/companies` | JWT | qualquer | listar empresas | [EXISTENTE] |
| GET | `/api/companies/:id` | JWT | qualquer | detalhe | [EXISTENTE] |
| POST | `/api/companies` | JWT | super_admin | criar | [EXISTENTE] |
| PATCH | `/api/companies/:id` | JWT | super_admin | atualizar | [EXISTENTE] |
| DELETE | `/api/companies/:id` | JWT | super_admin | excluir | [EXISTENTE] |
| GET | `/api/sectors` | JWT | qualquer | listar | [EXISTENTE] |
| GET | `/api/sectors/:id` | JWT | qualquer | detalhe | [EXISTENTE] |
| POST | `/api/sectors` | JWT | super_admin, admin_empresa | criar | [EXISTENTE] |
| PATCH | `/api/sectors/:id` | JWT | super_admin, admin_empresa | atualizar | [EXISTENTE] |
| DELETE | `/api/sectors/:id` | JWT | super_admin, admin_empresa | excluir | [EXISTENTE] |
| GET | `/api/assets` | JWT | qualquer | listar | [EXISTENTE] |
| GET | `/api/assets/:id` | JWT | qualquer | detalhe | [EXISTENTE] |
| POST | `/api/assets` | JWT | super_admin, admin_empresa | criar | [EXISTENTE] |
| PATCH | `/api/assets/:id` | JWT | super_admin, admin_empresa | atualizar | [EXISTENTE] |
| DELETE | `/api/assets/:id` | JWT | super_admin, admin_empresa | excluir | [EXISTENTE] |
| GET | `/api/devices` | JWT | qualquer | listar ESP32 | [EXISTENTE] |
| GET | `/api/devices/:id` | JWT | qualquer | detalhe | [EXISTENTE] |
| POST | `/api/devices` | JWT | super_admin, admin_empresa | criar (retorna token) | [EXISTENTE] |
| PATCH | `/api/devices/:id` | JWT | super_admin, admin_empresa | atualizar | [EXISTENTE] |
| DELETE | `/api/devices/:id` | JWT | super_admin, admin_empresa | excluir | [EXISTENTE] |
| GET | `/api/sensors` | JWT | qualquer | listar | [EXISTENTE] |
| GET | `/api/sensors/:id` | JWT | qualquer | detalhe | [EXISTENTE] |
| POST | `/api/sensors` | JWT | super_admin, admin_empresa | criar/vincular ativo+ESP32 | [EXISTENTE] |
| PATCH | `/api/sensors/:id` | JWT | super_admin, admin_empresa | atualizar | [EXISTENTE] |
| DELETE | `/api/sensors/:id` | JWT | super_admin, admin_empresa | excluir | [EXISTENTE] |
| POST | `/api/readings` | X-Token | device | ingerir `{esp_id, setor, sensor_id, vazao}` | [EXISTENTE] |
| GET | `/api/readings?sensorId=` | JWT | qualquer escopado | consultar leituras, paginado | [EXISTENTE] |
| GET | `/api/maintenances` | JWT | qualquer escopado | listar | [EXISTENTE] |
| GET | `/api/maintenances/:id` | JWT | qualquer escopado | detalhe | [EXISTENTE] |
| POST | `/api/maintenances` | JWT | qualquer escopado | abrir | [EXISTENTE] |
| PATCH | `/api/maintenances/:id` | JWT | qualquer escopado | atualizar status | [EXISTENTE] |
| DELETE | `/api/maintenances/:id` | JWT | qualquer escopado | excluir | [EXISTENTE] |
| GET | `/api/alerts` | JWT | qualquer | listar alertas | [EXISTENTE como stub 501 / NECESSÁRIO IMPLEMENTAR real] |
| GET | `/operador/dashboard` | — | operador | empresas ativas, chamados, OS, manutenções, sensores com problema | [NECESSÁRIO IMPLEMENTAR] |
| * | `/operador/*`, `/chamados`, `/ordens-servico` | — | — | fluxos opneai §7/8/14/15 | [NECESSÁRIO IMPLEMENTAR] |

Payload firmware [EXISTENTE]: `{ esp_id, setor, sensor_id, vazao }` + header `X-Token`. Resposta padrão `{ success, data, meta? }`, paginação `page/pageSize max 100`, erros `400/401/403/404/409/422/500/501`.

---

## 10. Domínios opneai × realidade

- Empresas clientes [EXISTENTE] CRUD + isolamento. Falta dashboard agregado [NECESSÁRIO IMPLEMENTAR].
- Setores (Produção/Limpeza/Resfriamento como exemplos) [EXISTENTE] genérico `nome`.
- Ativos (Enchedora etc.) [EXISTENTE] genérico + `tag/tipo/criticidade`.
- Sensores: cadastro/vínculo/status/histórico [EXISTENTE]; localização/instalação/inspeção dedicadas [NECESSITA DEFINIÇÃO] (hoje só `descricao` + manutenções).
- Monitoramento: leitura atual/histórico por `sensorId` [EXISTENTE]; consumo agregado/vazão por período/anomalias [NECESSÁRIO IMPLEMENTAR] (sem agregação, sem cache, sem job).
- Chamados [NECESSÁRIO IMPLEMENTAR] — sem model, rota ou tabela.
- Ordem de serviço [NECESSÁRIO IMPLEMENTAR] — sem separação Chamado × OS.
- Manutenção [EXISTENTE] parcial: `preventiva/corretiva/inspecao` + status existem, mas separação "cliente cuida sensor × fornecedora cuida ESP32+LCD" **não** está no código — sem campo alvo `sensor vs esp32`, sem trava por perfil [NECESSITA DEFINIÇÃO / NECESSÁRIO IMPLEMENTAR se regra confirmada].
- Operador fornecedora + Dashboard operador [NECESSÁRIO IMPLEMENTAR] — hoje só `super_admin` global sem endpoints agregados.

---

## 11. Comunicação backend ↔ banco [EXISTENTE]

- Prisma Client singleton; `MOCK_MODE` desvia para mock em memória com seed (2 empresas, 4 users `senha123`, setores/ativos/devices/sensores/leituras/manutenções).
- Transações: usar Prisma `$transaction` onde multi-escrita [NECESSITA DEFINIÇÃO por caso].
- Índices: `idx_leitura_sensor_data`, `idx_manutencao_status`. Avaliar índice `sensor(ativoId)`, `esp32(setorId)`, `setor(empresaId)` conforme crescimento.
- BigInt `Leitura.id` serializado para Number no JSON.
- Fluxo de mudança: `schema.prisma (+ db.sql até unificar) → migration → database → repository/service → controller → routes → middleware → API`. Nunca só Prisma.

---

## 12. Endpoints consumíveis pelo frontend hoje [EXISTENTE]

Auth + CRUD users/companies/sectors/assets/devices/sensors + leitura/criação de readings + CRUD maintenances + health + OpenAPI `/docs` e `/docs/openapi.json`. Script `simulate-esp32.ts` permite testar ingestão sem hardware. Usuários mock `super@siva.com / carla.mendes@aquaplas.com / diego.ramos@aquaplas.com` senha `senha123`.

---

## 13. O que falta implementar (resumo)

1. `GET /api/alerts` real + motor de detecção (vazamento/consumo anômalo) + model `Alerta` [NECESSÁRIO IMPLEMENTAR].
2. Dashboard operador + agregações (empresas ativas, sensores com problema, manutenções agendadas) [NECESSÁRIO IMPLEMENTAR].
3. Chamados + Ordens de serviço (models, fluxos, permissões) [NECESSÁRIO IMPLEMENTAR].
4. Regra manutenção sensor×ESP32 por perfil [NECESSITA DEFINIÇÃO].
5. Agregações de consumo, paginação reforçada, índices, jobs/cache com justificativa [NECESSÁRIO IMPLEMENTAR quando exigido].
6. Hardening: hash do `device.token`, rotação, refresh/revogação JWT, `JWT_SECRET` obrigatório em prod [NECESSITA DEFINIÇÃO].
7. Primeira migration Prisma versionada + unificação `db.sql` × `schema.prisma` [NECESSÁRIO IMPLEMENTAR].
8. PostgreSQL × MySQL: decidir fonte da verdade [NECESSITA DEFINIÇÃO].

---

## 14. Riscos / problemas arquiteturais identificados

- `Esp32.token` em texto plano + sem expiração — risco de segurança.
- `JWT_SECRET` com default inseguro; `DATABASE_URL` só validada se `!MOCK`.
- `maintenances` sem `authorize` na rota — depende só de escopo no service; revisar se `funcionario` pode excluir.
- `alerts` expõe `501` em rota autenticada — ok como stub, mas frontend não deve tratar como funcional.
- `db.sql` + `schema.prisma` duplos sem migration — risco de drift.
- `Leitura.id BigInt → Number` pode estourar `MAX_SAFE_INTEGER` em volume alto [NECESSITA DEFINIÇÃO: manter BigInt string ou UUID].
