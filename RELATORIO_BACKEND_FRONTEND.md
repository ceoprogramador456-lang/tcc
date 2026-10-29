# RELATÓRIO TÉCNICO — BACK-END SIVA (somente leitura, nenhum arquivo alterado)

Baseado exclusivamente no código real em `/workspaces/Siva`. Verificado via `src/`, `prisma/schema.prisma`, `src/docs/openapi.ts`, `src/routes/index.ts`, validators, services, middlewares.

---

## 1. Visão geral e stack

| Item | Valor real |
|---|---|
| Nome/versão | `siva-backend@0.1.0` (`package.json:1-4`) |
| Runtime | Node `>=22`, ESM (`"type":"module"`) |
| Framework | Express `^5.0.1` |
| ORM/Banco | Prisma `^6.2.1` + MySQL (`datasource db provider mysql`, `prisma/schema.prisma:9-12`). Schema espelha `db/db.sql` 1:1 (comentário `schema.prisma:1-3`) |
| Auth | `jsonwebtoken ^9.0.2` + `bcryptjs ^2.4.3` |
| Validação | `zod ^3.24.1` na borda via `validate` middleware |
| Infra | `helmet`, `cors`, `compression`, `express-rate-limit`, `pino` + `pino-pretty`, `dotenv`, `swagger-ui-dist` |
| Scripts | `dev: tsx watch src/server.ts`, `dev:mock: MOCK_MODE=true`, `build: tsc -p tsconfig.build.json`, `start: node dist/server.js`, `test: vitest run`, `seed: tsx prisma/seed.ts`, `simulate:esp32: tsx scripts/simulate-esp32.ts` (`package.json:10-30`) |
| Testes | `vitest`, `supertest`, config `vitest.config.ts` força `MOCK_MODE=true`, `JWT_SECRET=test-secret...`, include `tests/**/*.test.ts` |

Estrutura `src/` (98 `.ts`):

```text
src/app.ts (factory createApp)
src/server.ts (listen + graceful shutdown)
src/config/env.ts
src/database/prisma.ts
src/routes/index.ts (monta /api + /health)
src/docs/openapi.ts + docs.routes.ts (/docs)
src/middlewares/ (5): auth, validate, error-handler, not-found, request-logger
src/shared/auth/scope.ts, shared/errors/, shared/http/ (api-response, pagination), shared/mock/ (3)
src/modules/ (11): auth, users, companies, sectors, assets, devices, sensors, readings, maintenances, alerts, dashboard
  padrão por módulo: controllers/ services/ repositories/ dtos/ entities/ validators/ routes/
  exceções: dashboard (só controller/service/route), auth (repository/entity vazios), alerts (repository vazio)
src/types/express.d.ts, utils/ (async-handler, bigint-json, logger), interfaces/repository.interface.ts
src/jobs/ só README.md, sem código
```

Não existe: WebSocket, upload, integração externa, queue/job. `firmware/` existe na raiz mas não faz parte do back-end.

---

## 2. Boot, configuração e fluxo real da requisição

### 2.1 Entrypoints

`src/server.ts`: `createApp()` + `app.listen(env.PORT)` + log `port/mockMode/env` + `SIGINT/SIGTERM → server.close → disconnectDatabase()`.

`src/app.ts:createApp()`:

```text
import './utils/bigint-json.js' (BigInt.prototype.toJSON → Number, necessário p/ Leitura.id BigInt)
disable x-powered-by
→ helmet (CSP script-src 'self' 'unsafe-inline' p/ docs)
→ cors ({origin: CORS_ORIGIN==='*' ? true : split(',')})
→ compression()
→ express.json({limit:'1mb'})
→ requestLogger (X-Request-Id + req.log)
→ rateLimit({windowMs, limit, standardHeaders:true})
→ /docs (docsRoutes)
→ /api (apiRoutes)
→ notFoundMiddleware (404 ROUTE_NOT_FOUND)
→ errorHandler (4 args, final)
```

`src/routes/index.ts:15-31`: `GET /health` pública + `use()` para 11 routers: `/auth,/users,/companies,/sectors,/assets,/devices,/sensors,/readings,/maintenances,/alerts,/dashboard`. Prefixo final = `/api` + prefixo.

`src/database/prisma.ts`: singleton `global.__sivaPrisma`; se `MOCK_MODE=true`, `prisma = undefined` (nunca instancia, roda sem MySQL/`prisma generate`).

### 2.2 Fluxo adaptado à realidade

```text
Cliente
 ↓ (JSON ≤1mb, CORS, rate-limit, X-Request-Id)
Route (declara path+método, ex. modules/users/routes/user.routes.ts)
 ↓
authenticateUser (Bearer JWT) OU authenticateDevice (X-Token, só POST /readings)
 ↓
authorize(...roles) quando presente
 ↓
validate({body,params,query}) Zod → 422 se falhar
 ↓
Controller fino (extrai req.user/req.device/params/query/body → chama service → ok/created/paginated/noContent)
 ↓
Service (regras: assertSameCompany, valida combinação tipo/empresa, unicidade, relações setor→empresa)
 ↓
Repository dual: Prisma OU Mock em memória (createXRepository() escolhe por env.MOCK_MODE)
 ↓
Prisma MySQL OU MockCollection
 ↓
Resposta {success:true,data[,meta]} ou {success:false,error:{code,message,details}}
```

Sem camadas faltantes: controller/service/repository existem em 8/11 módulos. Não há DTO-transform fora de `toPublicUser/toPublicDevice`.

### 2.3 Variáveis de ambiente (`src/config/env.ts:4-18`, `.env.example`)

| Var | Tipo/default | Obrigatória? |
|---|---|---|
| `NODE_ENV` | `development\|test\|production`, default `development` | não |
| `PORT` | int+, default `3000` | não |
| `MOCK_MODE` | string `true/false` → boolean, default `false`. `true` = 100% memória, ignora MySQL, ideal p/ frontend | não |
| `DATABASE_URL` | string, ex. `mysql://root:root@localhost:3306/siva_db` | sim se `MOCK_MODE=false`, senão boot aborta |
| `JWT_SECRET` | min 8, default `troque-este-valor-em-producao` | não (trocar em prod) |
| `JWT_EXPIRES_IN` | string, default `8h` | não |
| `CORS_ORIGIN` | string, default `*` (em `app.ts:28`: `*`→`true`, senão `split(',')`); exemplo `http://localhost:5173` | não |
| `RATE_LIMIT_WINDOW_MS` | default `60000` | não |
| `RATE_LIMIT_MAX` | default `100` | não |
| `LOG_LEVEL` | `fatal..silent`, default `info` | não |

---

## 3. Autenticação e autorização (contrato crítico p/ frontend)

### 3.1 JWT usuários (dashboard)

Login: `POST /api/auth/login` (`auth.service.ts:12-35`): `findByEmail → bcrypt.compare → 401 'E-mail ou senha inválidos.'` se falhar; `403` se `status==='INATIVO'`; payload JWT = `{id,email,tipo,empresaId}` (`AuthenticatedUser`, `types/express.d.ts:8-13`), assinado com `JWT_SECRET/JWT_EXPIRES_IN`. Retorna `200 {success:true,data:{token,user:PublicUser sem senha}}`.

Uso: header `Authorization: Bearer <jwt>` (`auth.middleware.ts:9-23`). Ausente → `401 Token ausente`; inválido/expirado → `401 Token inválido ou expirado`. `GET /api/auth/me` recarrega do banco e re-bloqueia INATIVO (`auth.service.ts:37-44`).

### 3.2 RBAC (`authorize(...allowed)`, `auth.middleware.ts:25-31`)

Exige `req.user`, senão `401`; se `tipo` fora da lista → `403 Acesso não permitido`. Matriz real por rota (ver §6):

- `GET /users*` = `ADMIN,GESTOR`; `POST/PATCH/DELETE /users*` = só `ADMIN`
- `GET /companies, GET /companies/:id` = qualquer autenticado (service filtra); `GET /:id/details, /:id/users, POST/PATCH/DELETE` = só `ADMIN`
- `sectors/assets/devices/sensors`: `GET` = autenticado; mutações = `ADMIN,GESTOR` (TECNICO só lê)
- `readings GET` = autenticado (escopo via sensor); `readings POST` = sem JWT (ver 3.3)
- `maintenances/*`, `alerts GET` = só `authenticateUser`, sem `authorize` (qualquer papel, escopo via sensor)
- `dashboard/admin-summary` = só `ADMIN`

Multiempresa (`shared/auth/scope.ts:4-17`): `isAdmin = tipo==='ADMIN'` (alias `isSuperAdmin`); `assertSameCompany`: ADMIN pula; demais exigem `user.empresaId === empresaId`, senão `403 Você não tem acesso...`. Nunca confiar em `empresaId` do client sozinho.

Roles oficiais: `ADMIN (empresaId=null, especialidade=null)`, `GESTOR (empresaId obrigatório, especialidade=null)`, `TECNICO (empresaId+especialidade MECANICO/ELETRICISTA obrigatórios)`. Validado em Zod (`user.validators.ts:17-66`) + service (`assertValidCombination`).

### 3.3 X-Token ESP32

Só `POST /api/readings` (`reading.routes.ts:10-15`). Middleware `authenticateDevice` (`auth.middleware.ts:33-57`): lê `X-Token`, `findDeviceByToken`, injeta `req.device={id,espId,setorId}`; ausente/inválido → `401`. Service (`reading.service.ts:21-29`) exige `body.esp_id === device.espId` senão `403`, sensor `(device.id + sensor_id)` existente senão `404`, depois `create + touchContact(ultimoContato=now)`.

Token gerado server-side `dev-<rand><timestamp>` (`device.repository.ts`), **exposto só no `POST /devices` 201**; demais respostas usam `toPublicDevice` (omite `token`, `device.entity.ts:11-16`). Nunca logar/enviar em erro.

OpenAPI declara `bearerAuth (http/bearer/JWT)` e `xTokenAuth (apiKey/header/X-Token)` (`openapi.ts:77-81`).

---

## 4. Modelos (Prisma) — fonte para tipar o frontend

`prisma/schema.prisma:14-176`, MySQL, `@@map` snake_case.

| Model | Campos (tipo/constraints) |
|---|---|
| `Empresa` | `id int PK, nome varchar100, cnpj varchar20? @unique, criadoEm DateTime, usuarios[], setores[]` |
| `Usuario` | `id, nome100, email100 @unique, senha255(hash), tipo ADMIN\|GESTOR\|TECNICO, especialidade MECANICO\|ELETRICISTA?, status ATIVO(def)\|INATIVO, empresaId int? (null=ADMIN), criadoEm` |
| `Setor` | `id, empresaId FK, nome100, criadoEm` |
| `Ativo` | `id, setorId FK, nome100, tag50? @unique, tipo50?, criticidade baixa\|media(default)\|alta, centroCusto50?, fotoUrl255?(url), manualUrl255?(url), descricao255?, criadoEm` |
| `Esp32` | `id, setorId FK, espId50 @unique (id lógico firmware), token255 @unique (X-Token), descricao100?, ultimoContato?, criadoEm` |
| `Sensor` | `id, ativoId FK, esp32Id FK, sensorId50 (id físico, ex sensor_01), tag50? @unique, descricao100?, ativoStatus bool def true, criadoEm, @@unique([esp32Id,sensorId])` |
| `Leitura` | `id BigInt PK (serializado como Number via bigint-json), sensorId FK, vazao Float, registradoEm def now, @@index([sensorId,registradoEm])` |
| `Manutencao` | `id, sensorId FK, tipo preventiva\|corretiva\|inspecao, status aberto(def)\|em_andamento\|concluido, descricao Text?, funcionarioId? FK Usuario, abertoEm def now, concluidoEm? (auto-preenchido quando status→concluido), @@index([status])` |

Hierarquia: `Empresa → Setor → (Ativo, Esp32) → Sensor (ativoId+esp32Id mesmo setor obrigatório) → (Leitura, Manutencao)`.

Seed (`prisma/seed.ts`): empresa `Aquaplás`, ADMIN `admin@siva.local/super@siva.com`, GESTOR `carla...`, TECNICO MECANICO `diego...` (senha `senha123`), setor `Produção`, `esp_01/dev-token-esp01`, ativo `AT-PRD-001`, sensor `sensor_01/SN-PRD-001`, manutenção preventiva. Mock (`shared/mock/mock-store.ts`) tem 2 empresas, 4 users, 3 setores/ativos/devices/sensores, 25 leituras/sensor, 2 manutenções.

---

## 5. Padrões de resposta, erro, paginação

Sucesso (`shared/http/api-response.ts`): `ok → 200 {success:true,data}`, `created → 201`, `noContent → 204 vazio` (todos DELETE), `paginated → 200 {success:true,data[],meta:{total,page,pageSize,totalPages}}`.

Paginação (`shared/http/pagination.ts:8-12`): `page=max(1,|1)`, `pageSize=min(100,max(1,|20))`. Listas ordenam `id asc`, exceto readings `registradoEm desc` (default `pageSize 50`) e maintenances `abertoEm desc`.

Erro (`middlewares/error-handler.ts` + `not-found`):

```json
422 {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Dados inválidos.","details":{"fieldErrors":{},"formErrors":[]}}}
401 {"success":false,"error":{"code":"UNAUTHORIZED","message":"..."}}
403 {"success":false,"error":{"code":"FORBIDDEN","message":"..."}}
404 {"success":false,"error":{"code":"NOT_FOUND","message":"..."}}
409 {"success":false,"error":{"code":"CONFLICT","message":"Registro já existe..."}}
404 {"success":false,"error":{"code":"ROUTE_NOT_FOUND","message":"Rota METHOD /api/xxx não existe."}}
500 {"success":false,"error":{"code":"INTERNAL_SERVER_ERROR","message":"..."}}
501 GET /alerts NotImplemented
```

Frontend deve: checar `success`, usar `data`, usar `meta.total/page/pageSize/totalPages` p/ paginar, exibir `error.message`, tratar `401→re-login`, `403→sem permissão`, `422→destacar campo via details.fieldErrors`, `409→duplicidade`.

---

## 6. Tabela geral de endpoints (45 `/api` + 3 `/docs`)

Base `http://host:PORT/api`, `Content-Type: application/json` (exceto 204). Auth `B`=Bearer JWT, `X`=X-Token.

| Método | Endpoint | Auth | Query/body principal | Resposta | Status |
|---|---|---|---|---|---|
| GET | `/health` | — | — | `{status:'ok',mockMode,env}` | 200 |
| POST | `/auth/login` | — | `{email,senha}` | `{token,user}` | 200/401/422 |
| GET | `/auth/me` | B | — | `User` | 200/401/403 |
| GET | `/users/` | B ADMIN,GESTOR | `empresaId?,tipo?,status?,page?,pageSize?` | `User[] paginado` | 200/401/403/422 |
| GET | `/users/:id` | B ADMIN,GESTOR | param `id` | `User` | 200/401/403/404/422 |
| POST | `/users/` | B ADMIN | `{nome2-100,email,senha6-72,tipo,empresaId?,especialidade?,status?}` + regras tipo | `User` | 201/401/403/409/422 |
| PATCH | `/users/:id` | B ADMIN | parcial mesmo schema | `User` | 200/... |
| PATCH | `/users/:id/status` | B ADMIN | `{status:ATIVO\|INATIVO}` | `User` | 200/... |
| DELETE | `/users/:id` | B ADMIN | — | vazio | 204/401/403/404/409 |
| GET | `/companies/` | B | `page?,pageSize?` (ADMIN tudo, demais só própria) | `Company[]` | 200 |
| GET | `/companies/:id` | B | — | `Company{id,nome,cnpj,criadoEm}` | 200/404/403 |
| GET | `/companies/:id/details` | B ADMIN | — | `{empresa,funcionarios[],setores[],resumo:{funcionarios,setores,ativos,esp32,sensores}}` | 200/403/404 |
| GET | `/companies/:id/users` | B ADMIN | `page?,pageSize?` | `User[] paginado` | 200 |
| POST | `/companies/` | B ADMIN | `{nome2-100,cnpj≤20?}` | `Company` | 201/409/422 |
| PATCH | `/companies/:id` | B ADMIN | parcial | `Company` | 200 |
| DELETE | `/companies/:id` | B ADMIN | — | vazio | 204/404/409 |
| GET | `/sectors/` | B | `empresaId?,page?,pageSize?` | `Sector[]` | 200 |
| GET | `/sectors/:id` | B | — | `Sector{id,empresaId,nome,criadoEm}` | 200/404/403 |
| POST | `/sectors/` | B ADMIN,GESTOR | `{empresaId,nome2-100}` | `Sector` | 201 |
| PATCH | `/sectors/:id` | B ADMIN,GESTOR | `{nome}` (empresaId imutável) | `Sector` | 200 |
| DELETE | `/sectors/:id` | B ADMIN,GESTOR | — | vazio | 204/409 |
| GET | `/assets/` | B | `setorId obrigatório,page?,pageSize?` | `Asset[]` | 200/422/403 |
| GET | `/assets/:id` | B | — | `Asset` | 200/404 |
| POST | `/assets/` | B ADMIN,GESTOR | `{setorId,nome,tag?,tipo?,criticidade baixa\|media(def)\|alta,centroCusto?,fotoUrl(url)?,manualUrl(url)?,descricao?}` | `Asset` | 201 |
| PATCH | `/assets/:id` | B ADMIN,GESTOR | parcial sem `setorId` | `Asset` | 200 |
| DELETE | `/assets/:id` | B ADMIN,GESTOR | — | vazio | 204 |
| GET | `/devices/` | B | `setorId obrigatório` | `PublicDevice[] (sem token)` | 200 |
| GET | `/devices/:id` | B | — | `PublicDevice` | 200 |
| POST | `/devices/` | B ADMIN,GESTOR | `{setorId,espId2-50,descricao?}` (token gerado) | `Device COM token (única vez)` | 201/409 |
| PATCH | `/devices/:id` | B ADMIN,GESTOR | `{descricao?}` só | `PublicDevice` | 200 |
| DELETE | `/devices/:id` | B ADMIN,GESTOR | — | vazio | 204 |
| GET | `/sensors/` | B | `esp32Id?,ativoId?,page?,pageSize?` | `Sensor[]` | 200 |
| GET | `/sensors/:id` | B | — | `Sensor` | 200 |
| POST | `/sensors/` | B ADMIN,GESTOR | `{ativoId,esp32Id,sensorId1-50,tag?,descricao?,ativoStatus def true}` + mesmo setor obrigatório | `Sensor` | 201/403/409 |
| PATCH | `/sensors/:id` | B ADMIN,GESTOR | `{tag?,descricao?,ativoStatus?}` (vínculos imutáveis) | `Sensor` | 200 |
| DELETE | `/sensors/:id` | B ADMIN,GESTOR | — | vazio | 204 |
| POST | `/readings/` | X | `{esp_id,sensor_id,vazao≥0,setor?}` | `Reading{id,sensorId,vazao,registradoEm}` | 201/401/403/404/422 |
| GET | `/readings/` | B | `sensorId obrigatório,page?,pageSize?` | `Reading[] desc` | 200 |
| GET | `/maintenances/` | B | `sensorId obrigatório` | `Maintenance[]` | 200 |
| GET | `/maintenances/:id` | B | — | `Maintenance` | 200 |
| POST | `/maintenances/` | B | `{sensorId,tipo preventiva\|corretiva\|inspecao,descricao≤2000?,funcionarioId?}` (funcionário deve ser da mesma empresa e ATIVO) | `Maintenance` | 201 |
| PATCH | `/maintenances/:id` | B | `{status?,descricao?,funcionarioId?}` (concluido preenche `concluidoEm`) | `Maintenance` | 200 |
| DELETE | `/maintenances/:id` | B | — | vazio | 204 |
| GET | `/alerts/` | B | `sensorId?` | sempre `501 NOT_IMPLEMENTED` (controller `alert.controller.ts:6-8` nem responde, service lança) | 501 |
| GET | `/dashboard/admin-summary` | B ADMIN | — | `{nEmpresas,nFuncionarios,nSensores,nEsp32,funcionarios:{total,gestores,tecnicos,mecanicos,eletricistas,ativos,inativos}}` | 200/403 |
| GET | `/docs/openapi.json` | — | — | OpenAPI 3.0.3 | 200 |
| GET | `/docs/` | — | — | HTML lista paths | 200 |

Detalhes verificados: `validate` torna `setorId/sensorId` obrigatórios onde indicado (422 se ausente); `fotoUrl/manualUrl` exigem URL válida; `vazao` coagido p/ number `≥0`; `concluidoEm` automático; `details` faz N+1 por setor/ESP com `BIG_PAGE=10000` (`company.service.ts:17,91-107`).

---

## 7. Como o frontend deve consumir

- `baseURL = /api` (OpenAPI `servers:[/api]`). Docs vivas: `GET /docs` + `GET /docs/openapi.json` (`docs.routes.ts`, montado em `/docs`).
- Login → guarda `token` + `user{tipo,empresaId}`; envia `Authorization: Bearer <token>` em tudo exceto `/health,/auth/login,POST /readings,/docs`. Renova em `401`.
- Navegação hierárquica obrigatória: `companies → sectors?empresaId → assets/devices?setorId → sensors?esp32Id/ativoId → readings/maintenances?sensorId`. Sem `setorId/sensorId` várias listas retornam `422`.
- `POST /devices`: salvar `token` retornado imediatamente (não volta a aparecer). Exibir como segredo único.
- `POST /readings` é só firmware (X-Token); frontend só faz `GET`.
- `GET /companies/:id/details` (ADMIN) já entrega tela “Ver mais”; `GET /dashboard/admin-summary` (ADMIN) entrega cards globais — não calcular no client.
- Tratar `meta` p/ paginar (`page/pageSize`, máx 100), `204` sem body, `422 fieldErrors`, `409` duplicidade (`email, cnpj, tag, espId, token, [esp32Id+sensorId]` → P2002).
- CORS: configurar `CORS_ORIGIN` p/ origem do front (default `*` só dev); `express.json` limite `1mb`; rate-limit `100/min` default pode dar `429` em polling agressivo.
- Rodar sem banco: `MOCK_MODE=true npm run dev` (ou `npm run dev:mock`); com banco: `npm run prisma:deploy && npm run seed && npm run dev`.
- Simular ESP32: `npm run simulate:esp32` (`scripts/simulate-esp32.ts`, env `BASE_URL/ESP_TOKEN/ESP_ID/SENSOR_ID/INTERVAL_MS`).

---

## 8. Limitações, inconsistências e riscos (não corrigidos, só registrados)

1. `GET /alerts` quebrado por design: `alert.controller.ts:6-8` chama `alertService.list()` sem `await/resposta`, service sempre lança `501`. Frontend deve tratar como indisponível/esconder.
2. OpenAPI parcial: documenta só `health, auth, companies (list/post/get/details/users), users/:id/status, dashboard, sectors/, assets/, devices/, sensors/, readings, maintenances/, alerts`. Faltam `users CRUD completo, companies PATCH/DELETE/:id, sectors/:id + mutações, assets/:id, devices/:id, sensors/:id, maintenances/:id`. Não usar OpenAPI como lista completa de rotas.
3. Schemas OpenAPI defasados: `Asset` omite `tipo,centroCusto,fotoUrl,manualUrl,descricao`; `Sensor` omite `descricao`; `Maintenance` omite `funcionarioId,abertoEm,concluidoEm`; `User` omite `criadoEm`; `Reading.id` como integer mas real é BigInt→Number.
4. `POST /companies` sem checagem de empresa no service (só `authorize ADMIN` na rota) — ok hoje, frágil se rota mudar.
5. `maintenances` sem `authorize` por papel: qualquer TECNICO autenticado com acesso ao sensor pode criar/editar/excluir chamados, inclusive atribuir `funcionarioId` de outra pessoa (desde que mesma empresa/ATIVO).
6. `details` e `adminSummary` contam via `list({pageSize:1})` + N+1 (`company.service.ts`, `dashboard.service.ts`) — `details` de empresa grande pode ser lento; frontend deve cachear e evitar chamadas repetidas.
7. `DELETE` físico em `users/companies/sectors/assets/devices/sensors/maintenances` (409 se FK, senão apaga). Só `users` tem inativação (`ATIVO/INATIVO`); demais sem soft-delete.
8. `updateUser` parcial: trocar só `tipo` sem ajustar `empresaId/especialidade` passa no Zod e cai no service — frontend deve sempre enviar combinação completa ao trocar tipo.
9. `X-Request-Id`, `helmet`, `rate-limit`, `requestLogger` globais — frontend deve propagar `X-Request-Id` se quiser correlação e respeitar `429`.
10. Dupla fonte de verdade DB: `db/db.sql` + `prisma/schema.prisma` + `prisma/migrations` — divergência futura possível; `MOCK_MODE` diverge de tipos Prisma (ex. mock ignora FK reais).
11. Sem paginação em `details/usersByCompany` agregados (traz até 10000) e sem filtros de data em `readings` (só `sensorId` + paginação) — gráficos de vazão precisarão paginar muito ou agregar no client.

Credenciais de teste (seed/mock): `admin@siva.local/senha123 (ADMIN)`, `carla.mendes@aquaplas.com/senha123 (GESTOR)`, `diego.ramos@aquaplas.com/senha123 (TECNICO MECANICO)`, ESP `esp_01/dev-token-esp01/sensor_01`.
