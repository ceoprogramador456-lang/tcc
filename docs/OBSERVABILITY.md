# Logs e Observabilidade

## Logs

- **Biblioteca**: [Pino](https://getpino.io/), instanciado em [`src/utils/logger.ts`](../src/utils/logger.ts).
- **Formato**: JSON estruturado em produção (`NODE_ENV=production`); em desenvolvimento/teste, saída colorida e legível via `pino-pretty` (`transport` só é configurado quando `!isProduction`).
- **Onde ficam**: `stdout` — não há arquivo de log nem rotação configurada neste repositório. Em produção, isso é responsabilidade de quem faz o deploy (ex.: coletar `stdout` do container via Docker/Caddy/uma stack de log agregado) — ver [DEPLOYMENT.md](./DEPLOYMENT.md) e [RUNBOOK.md](./RUNBOOK.md).
- **Nível**: controlado por `LOG_LEVEL` (`fatal | error | warn | info | debug | trace | silent`, default `info`).

### Log por requisição

[`request-logger.middleware.ts`](../src/middlewares/request-logger.middleware.ts) roda em toda requisição, antes das rotas, e:

1. Gera (ou reaproveita, se o cliente já mandou `X-Request-Id`) um `requestId` — devolvido também no header de resposta `X-Request-Id`, para correlacionar um log com uma chamada específica do frontend.
2. Cria um logger filho (`req.log = logger.child({ requestId })`) — todo log dado durante aquela requisição (inclusive os de erro, ver abaixo) carrega o `requestId` automaticamente.
3. No evento `finish` da resposta, loga uma linha com `method`, `url`, `statusCode` e `durationMs`, no nível `info` (2xx/3xx), `warn` (4xx) ou `error` (5xx ou exceção).

Exemplo de linha (modo desenvolvimento):

```
[14:32:10] INFO: request
    requestId: "b96539fa-a11d-4116-9d56-9d28af872f8a"
    method: "GET"
    url: "/api/sectors"
    statusCode: 200
    durationMs: 4
```

**O corpo da requisição nunca é logado** — decisão deliberada para não vazar senha/token acidentalmente em log (ver [SECURITY.md](./SECURITY.md#logs-e-auditoria)).

### Log de erro

`errorHandler` ([`error-handler.middleware.ts`](../src/middlewares/error-handler.middleware.ts)) loga com `req.log.error({ err }, ...)` sempre que:
- o erro é um `AppError` com `statusCode >= 500`, ou
- o erro não é um `AppError` conhecido (cai no branch genérico → sempre logado, sempre 500).

Erros de cliente (400/401/403/404/422) **não** geram log de erro — são esperados pelo funcionamento normal da API, não indicam um problema no servidor. Eles ainda aparecem no log de requisição (nível `warn`, pelo código 4xx).

## Health Check

`GET /api/health` (sem autenticação):

```json
{ "success": true, "data": { "status": "ok", "mockMode": true, "env": "development" } }
```

Hoje é um "liveness check" simples: confirma que o processo Express está de pé e respondendo, e informa em qual modo (`mockMode`) e ambiente está rodando. **Não verifica conectividade com o MySQL** — se o banco cair mas o processo Node continuar de pé, `/api/health` continua respondendo `200`. Ver limitação e o que fazer diante disso em [RUNBOOK.md](./RUNBOOK.md#serviço-fora-do-ar--respondendo-mas-com-erro).

## O que ainda não existe

🚧 Não implementado nesta etapa:

- **Métricas** (ex.: Prometheus `/metrics` com contadores de requisição, latência por rota, taxa de erro).
- **Tracing distribuído** (OpenTelemetry) — hoje a correlação entre serviços é só o `requestId` no log, não um trace propagado.
- **Health check "deep"** que efetivamente testa a conexão com o MySQL (`SELECT 1`) antes de responder `200`.
- **Dashboards** (Grafana ou equivalente) — não há stack de observabilidade provisionada neste repositório, nem no `docker-compose.yml` nem no `docker-compose.enterprise.yml`.

Esses itens aparecem no README raiz como parte de "Próximas etapas" ("Adicionar monitoramento, métricas e observabilidade").
