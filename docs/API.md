# Guia da API REST

Este documento complementa a documentação interativa: com o servidor rodando, a versão sempre-atualizada e navegável fica em `http://localhost:3000/docs` (Swagger UI), gerada a partir de [`src/docs/openapi.ts`](../src/docs/openapi.ts). Aqui você encontra as convenções gerais e exemplos completos de request/response — a lista de campos de cada schema em detalhe está no Swagger.

## Convenções

- **Base URL**: todas as rotas de negócio ficam sob `/api` (ex.: `http://localhost:3000/api/sectors`). `/api/health` não exige autenticação.
- **Formato de resposta** — toda resposta é um envelope JSON:
  ```json
  { "success": true, "data": { }, "meta": { } }
  ```
  `meta` só aparece em listagens paginadas. Erros usam `success: false` — ver [ERROR_HANDLING.md](./ERROR_HANDLING.md).
- **Paginação** — listagens aceitam `?page=1&pageSize=20` (`pageSize` máximo 100) e devolvem:
  ```json
  { "success": true, "data": [ ], "meta": { "total": 42, "page": 1, "pageSize": 20, "totalPages": 3 } }
  ```
- **Tipos de usuário** — `ADMIN` (global, sem empresa) · `GESTOR` (empresa obrigatória, sem especialidade) · `TECNICO` (empresa + especialidade `MECANICO|ELETRICISTA` obrigatórias). Status `ATIVO|INATIVO` (inativo não faz login).
- **Autenticação** — duas formas, nunca misturadas na mesma rota (ver [AUTHENTICATION.md](./AUTHENTICATION.md) para o fluxo completo):
  - `Authorization: Bearer <jwt>` — usuários do dashboard.
  - `X-Token: <token-do-dispositivo>` — só usado por `POST /api/readings` (o firmware do ESP32).
- **Content-Type**: `application/json` em todo request com corpo.

## Catálogo de endpoints

| Método | Rota | Auth | Papéis extras | Descrição |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | — | — | Healthcheck (status, modo mock, ambiente) |
| `POST` | `/api/auth/login` | — | — | Login por e-mail/senha, devolve JWT |
| `GET` | `/api/auth/me` | Bearer | — | Dados do usuário autenticado |
| `GET` | `/api/companies` | Bearer | — | Lista empresas (todas p/ ADMIN; só a própria p/ demais) |
| `GET` | `/api/companies/:id` | Bearer | — | Detalhe de uma empresa |
| `GET` | `/api/companies/:id/details` | Bearer | `ADMIN` | Agregado: empresa + funcionários + setores + resumo |
| `GET` | `/api/companies/:id/users` | Bearer | `ADMIN` | Funcionários de uma empresa (sem senha) |
| `POST` | `/api/companies` | Bearer | `ADMIN` | Cria empresa |
| `PATCH` | `/api/companies/:id` | Bearer | `ADMIN` | Edita empresa |
| `DELETE` | `/api/companies/:id` | Bearer | `ADMIN` | Remove empresa (409 se houver vínculos) |
| `GET` | `/api/users` | Bearer | `ADMIN`, `GESTOR` | Lista usuários (`?empresaId=&tipo=&status=`; GESTOR só vê a própria empresa) |
| `GET` | `/api/users/:id` | Bearer | `ADMIN`, `GESTOR` | Detalhe de um usuário |
| `POST` | `/api/users` | Bearer | `ADMIN` | Cria usuário (sem auto-registro público) |
| `PATCH` | `/api/users/:id` | Bearer | `ADMIN` | Edita usuário (nome/email/tipo/empresa/especialidade/senha) |
| `PATCH` | `/api/users/:id/status` | Bearer | `ADMIN` | Ativa/inativa (`{"status":"ATIVO"\|"INATIVO"}`) |
| `DELETE` | `/api/users/:id` | Bearer | `ADMIN` | Remove usuário (409 se houver histórico) |
| `GET` | `/api/dashboard/admin-summary` | Bearer | `ADMIN` | Contadores reais (empresas, funcionários, sensores, ESP32) |
| `GET` | `/api/dashboard/overview` | Bearer | — | Painel operacional: consumo, sensores, manutenções, ESP32 e atividades (`?empresaId=` p/ ADMIN) |
| `GET` | `/api/sectors` | Bearer | — | Lista setores (`?empresaId=`; escopado pela empresa do ator) |
| `GET` | `/api/sectors/:id` | Bearer | — | Detalhe de um setor |
| `POST` | `/api/sectors` | Bearer | `ADMIN`, `GESTOR` | Cria setor |
| `PATCH` | `/api/sectors/:id` | Bearer | `ADMIN`, `GESTOR` | Edita setor |
| `DELETE` | `/api/sectors/:id` | Bearer | `ADMIN`, `GESTOR` | Remove setor (409 se houver ativos/ESP32) |
| `GET` | `/api/assets` | Bearer | — | Lista ativos (`?setorId=` ou `?empresaId=` ou `?criticidade=`; escopado pela empresa do ator) |
| `GET` | `/api/assets/:id` | Bearer | — | Detalhe de um ativo |
| `POST` | `/api/assets` | Bearer | `ADMIN`, `GESTOR` | Cria ativo (setor validado contra a empresa do ator) |
| `PATCH` | `/api/assets/:id` | Bearer | `ADMIN`, `GESTOR` | Edita ativo (troca de setor só se os sensores permitirem) |
| `DELETE` | `/api/assets/:id` | Bearer | `ADMIN`, `GESTOR` | Remove ativo |
| `GET` | `/api/devices` | Bearer | — | Lista ESP32s (`?setorId=` ou `?empresaId=`; escopado; traz `online`) |
| `GET` | `/api/devices/:id` | Bearer | — | Detalhe de um ESP32 (sem o token) |
| `POST` | `/api/devices` | Bearer | `ADMIN`, `GESTOR` | Cria ESP32 — **token aparece só nesta resposta** (o banco guarda o hash) |
| `PATCH` | `/api/devices/:id` | Bearer | `ADMIN`, `GESTOR` | Edita ESP32 (descrição, esp_id, setor — nunca o token) |
| `DELETE` | `/api/devices/:id` | Bearer | `ADMIN`, `GESTOR` | Remove ESP32 |
| `GET` | `/api/sensors` | Bearer | — | Lista sensores (`?esp32Id=` `?ativoId=` `?empresaId=` `?ativoStatus=`) |
| `GET` | `/api/sensors/:id` | Bearer | — | Detalhe de um sensor |
| `POST` | `/api/sensors` | Bearer | `ADMIN`, `GESTOR` | Cria sensor (ativo + esp32 do mesmo setor) |
| `PATCH` | `/api/sensors/:id` | Bearer | `ADMIN`, `GESTOR` | Edita sensor |
| `DELETE` | `/api/sensors/:id` | Bearer | `ADMIN`, `GESTOR` | Remove sensor |
| `GET` | `/api/readings` | Bearer | — | Histórico de leituras (`?sensorId=`, obrigatório) |
| `POST` | `/api/readings` | **X-Token** | — | Ingestão de leitura pelo firmware do ESP32 |
| `GET` | `/api/maintenances` | Bearer | — | Lista chamados (`?sensorId=`, obrigatório) |
| `GET` | `/api/maintenances/:id` | Bearer | — | Detalhe de um chamado |
| `POST` | `/api/maintenances` | Bearer | — | Abre chamado (status sempre `aberto`) |
| `PATCH` | `/api/maintenances/:id` | Bearer | — | Atualiza status/descrição/responsável |
| `DELETE` | `/api/maintenances/:id` | Bearer | — | Remove chamado |
| `GET` | `/api/alerts` | Bearer | — | 🚧 Sempre `501 NOT_IMPLEMENTED` nesta etapa |

## Exemplos completos

### 1. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "carla.mendes@aquaplas.com",
  "senha": "senha123"
}
```

```json
200 OK
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 2,
      "nome": "Carla Mendes",
      "email": "carla.mendes@aquaplas.com",
      "tipo": "GESTOR",
      "especialidade": null,
      "status": "ATIVO",
      "empresaId": 1,
      "criadoEm": "2026-07-08T22:16:32.630Z"
    }
  }
}
```

Erros possíveis: `401 UNAUTHORIZED` (e-mail ou senha incorretos), `403 FORBIDDEN` (usuário INATIVO), `422 VALIDATION_ERROR` (payload fora do formato — `email` inválido ou `senha` ausente).

### 2. Criar um setor

```http
POST /api/sectors
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "empresaId": 1,
  "nome": "Envase"
}
```

```json
201 Created
{
  "success": true,
  "data": { "id": 3, "empresaId": 1, "nome": "Envase", "criadoEm": "2026-08-07T12:00:00.000Z" }
}
```

Erros possíveis: `401 UNAUTHORIZED` (sem token), `403 FORBIDDEN` (usuário tentando criar setor em empresa que não é a sua), `422 VALIDATION_ERROR` (`nome` ausente/curto, `empresaId` ausente).

### 3. Criar um ESP32 (cadastro legado por API)

Para placas com o firmware atual, use o [pareamento USB + OLED](ESP32_PAIRING.md):
`POST /api/device-pairings/request`, `/lookup`, `/approve`, `/status` e `/acknowledge`.
A credencial é entregue somente à placa. Novo pareamento usa
`POST /api/device-pairings/devices/:id/reset`, com JWT de ADMIN/GESTOR e escopo de empresa.
O contrato abaixo continua disponível para integração legada.

```http
POST /api/devices
Authorization: Bearer <jwt>
Content-Type: application/json

{ "setorId": 1, "espId": "esp_04", "descricao": "ESP32 da linha de envase" }
```

```json
201 Created
{
  "success": true,
  "data": {
    "id": 4,
    "setorId": 1,
    "espId": "esp_04",
    "token": "dev-7Kq2p1xN8vTn4wRb6mLc0hJ3sYd5fG",
    "descricao": "ESP32 da linha de envase",
    "ultimoContato": null,
    "online": false,
    "criadoEm": "2026-08-07T12:05:00.000Z"
  }
}
```

Guarde o `token` agora — nenhuma outra chamada (`GET /api/devices` ou `GET /api/devices/:id`) volta a mostrá-lo (ver [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md#fluxo-2--provisionamento-da-hierarquia-cadastro-inicial-de-uma-empresa)).

> **Segurança (2026-10-21):** o banco guarda apenas o **hash SHA-256** do token
> (`esp32.token_hash`). O valor em claro acima existe só nesta resposta — e o próprio
> `tokenHash` nunca é devolvido pela API. O `online` é calculado a partir do
> `ultimoContato` (janela de 10 minutos).

### 3.1 Listar dispositivos (escopo por empresa)

```http
GET /api/devices?empresaId=1&page=1&pageSize=20
Authorization: Bearer <jwt>
```

- `setorId` **ou** `empresaId` são filtros opcionais. Sem nenhum deles, a listagem é da
  empresa do usuário autenticado (para `ADMIN`, o consolidado de todas).
- Um `empresaId` de outra empresa resulta em `403` para `GESTOR`/`TECNICO`.
- O `online` de cada item reflete o último contato registrado.

### 4. Ingestão de leitura (firmware → API)

```http
POST /api/readings
X-Token: dev-token-esp01
Content-Type: application/json

{ "esp_id": "esp_01", "setor": "producao", "sensor_id": "sensor_01", "vazao": 13.5 }
```

```json
201 Created
{ "success": true, "data": { "id": 76, "sensorId": 1, "vazao": 13.5, "registradoEm": "2026-08-07T02:16:46.881Z" } }
```

Erros possíveis:
- `401 UNAUTHORIZED` — `X-Token` ausente ou inválido.
- `403 FORBIDDEN` — `esp_id` do corpo não corresponde ao dono do token.
- `404 NOT_FOUND` — `sensor_id` não existe para esse ESP32.
- `422 VALIDATION_ERROR` — `vazao` negativa ou ausente.

### 5. Listar leituras (dashboard)

```http
GET /api/readings?sensorId=1&page=1&pageSize=3
Authorization: Bearer <jwt>
```

```json
200 OK
{
  "success": true,
  "data": [
    { "id": 25, "sensorId": 1, "vazao": 12.5, "registradoEm": "2026-08-07T02:16:32.630Z" },
    { "id": 24, "sensorId": 1, "vazao": 12.84, "registradoEm": "2026-08-07T01:16:32.630Z" },
    { "id": 23, "sensorId": 1, "vazao": 12.86, "registradoEm": "2026-08-07T00:16:32.630Z" }
  ],
  "meta": { "total": 25, "page": 1, "pageSize": 3 }
}
```

### 6. Erro de validação cruzada (sensor em setores diferentes)

```http
POST /api/sensors
Authorization: Bearer <jwt>
Content-Type: application/json

{ "ativoId": 1, "esp32Id": 3, "sensorId": "sensor_02" }
```

Se `ativo #1` for do setor 1 e `esp32 #3` for do setor 2:

```json
422 Unprocessable Entity
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "O ativo e o ESP32 informados precisam pertencer ao mesmo setor."
  }
}
```

## 7. Painel operacional (agregações do dashboard)

```http
GET /api/dashboard/overview
Authorization: Bearer <jwt>
```

```json
200 OK
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2026-10-20T12:00:00.000Z",
      "fim": "2026-10-21T12:00:00.000Z"
    },
    "consumoAtual": { "valor": 20.7, "unidade": "L/min", "atualizadoEm": "2026-10-21T11:58:00.000Z" },
    "consumoDiario": { "valor": 28635.6, "unidade": "L", "atualizadoEm": null },
    "sensores": { "ativos": 2, "total": 3, "semLeituraNoPeriodo": 0 },
    "alertas": { "disponivel": false, "total": null },
    "manutencoes": { "pendentes": 1, "total": 2 },
    "esp32": { "online": 1, "total": 3 },
    "atividades": [
      {
        "id": "leitura-25",
        "tipo": "leitura",
        "titulo": "Leitura de vazão registrada",
        "descricao": "SN-PRD-001 reportou 12.5 L/min",
        "occurredAt": "2026-10-21T11:58:00.000Z"
      }
    ]
  }
}
```

Regras de cálculo:

- **Escopo:** a empresa do usuário autenticado. `ADMIN` pode filtrar por `?empresaId=`; sem o
  parâmetro, vê o consolidado de todas as empresas. `GESTOR`/`TECNICO` com `empresaId` de
  outra empresa recebem `403`.
- **Consumo atual (L/min):** soma da última leitura de cada sensor **ativo** que reportou
  dentro das últimas 24 h. Sensores sem leitura no período ficam de fora e são sinalizados em
  `sensores.semLeituraNoPeriodo`.
- **Consumo diário (L):** integração trapezoidal da série de leituras nas últimas 24 h
  (`vazao × Δt`). A leitura mais antiga do período é usada como base do primeiro intervalo.
- **Alertas:** `alertas.disponivel` é `false` e `total` é `null` — o módulo de detecção ainda
  responde `501`. A interface exibe estado vazio; nenhum número é inventado.
- **Atividades:** eventos efetivamente registrados (leituras, manutenções abertas e dispositivos
  que reportaram), ordenados do mais recente para o mais antigo.

## Testando sem escrever código

- `npm run simulate:esp32` — simula um ESP32 chamando `POST /api/readings` de verdade, em loop.
- Swagger UI (`/docs`) tem um botão "Try it out" em cada rota.
- Coleção de exemplos via `curl` para todo o fluxo de login → listagem está no [README raiz](../README.md#-como-executar).
