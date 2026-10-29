# Deploy, CI/CD e Versionamento

## Variáveis de ambiente

Referência completa (default em `.env.example`, aplicado/validado em [`src/config/env.ts`](../src/config/env.ts) com Zod — a API recusa subir se algo obrigatório faltar):

| Variável | Default | Efeito |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `test` \| `production`. Controla formato do log (pretty vs. JSON) e verbosidade de erro 500 |
| `PORT` | `3000` | Porta HTTP |
| `MOCK_MODE` | `false` | `true` = toda a persistência é em memória, `DATABASE_URL` é ignorado, `PrismaClient` nem é instanciado |
| `DATABASE_URL` | — | Connection string MySQL (`mysql://user:pass@host:3306/db`). **Obrigatória se `MOCK_MODE=false`** |
| `JWT_SECRET` | ⚠️ `troque-este-valor-em-producao` | Segredo de assinatura dos JWTs. **Troque sempre em produção** — ver [SECURITY.md](./SECURITY.md#segredos-jwt_secret) |
| `JWT_EXPIRES_IN` | `8h` | Validade do token de login |
| `CORS_ORIGIN` | `*` | Origem(ns) permitida(s) pelo CORS, separadas por vírgula |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Janela do rate limit global, em ms |
| `RATE_LIMIT_MAX` | `100` | Requisições permitidas por janela, por IP |
| `LOG_LEVEL` | `info` | Nível mínimo de log do Pino |

## Build de produção (sem Docker)

```bash
npm ci
npx prisma generate
npm run build      # gera dist/ a partir de src/ (tsconfig.build.json)
npm start          # node dist/server.js
```

## Docker

### Imagem (`Dockerfile`, multi-stage)

```mermaid
flowchart LR
    base["base<br/>node:22-alpine"] --> deps["deps<br/>npm ci (com devDependencies)"]
    deps --> build["build<br/>copia código, prisma generate, npm run build"]
    base --> runtime["runtime<br/>npm ci --omit=dev + copia dist/ e o Prisma Client gerado do stage build"]
    build -.->|dist/, node_modules/.prisma, node_modules/@prisma| runtime
```

A imagem final (`runtime`) não carrega devDependencies nem o código-fonte TypeScript — só `dist/`, o Prisma Client já gerado e o `prisma/schema.prisma` (necessário em runtime só se algo rodar `prisma migrate deploy` dentro do container). Roda como usuário `node` (não root), expõe a porta `3000`.

### `docker compose up` — desenvolvimento local (API + MySQL)

[`docker-compose.yml`](../docker-compose.yml) sobe um MySQL 8.4 com healthcheck e a API no stage `build` (tem as devDependencies, então `npm run dev` funciona com hot-reload via volume montado). Ao subir, roda `prisma migrate deploy` antes de iniciar. **Não precisa disso** se você só quer consumir a API — `npm run dev:mock` sem Docker é mais rápido para esse caso.

```bash
docker compose up --build
```

### `docker-compose.enterprise.yml` — topologia de produção/homologação

Adiciona um [Caddy](https://caddyserver.com/) como reverse proxy na frente da API (TLS automático via [`Caddyfile`](../Caddyfile)) e exige `MYSQL_ROOT_PASSWORD`/`JWT_SECRET` explícitos (o compose falha a subir sem eles — `${VAR:?mensagem}`, de propósito, para não deixar rodar com segredo default). Ver ⚠️ gap de `trust proxy` nessa topologia em [SECURITY.md](./SECURITY.md#rate-limiting) antes de usar isso com tráfego real.

```bash
export MYSQL_ROOT_PASSWORD=<segredo-forte>
export JWT_SECRET=<segredo-forte>
docker compose -f docker-compose.enterprise.yml up -d --build
```

```mermaid
flowchart LR
    Internet --> Caddy["Caddy<br/>:80/:443, TLS automático"]
    Caddy --> API["API<br/>stage runtime"]
    API --> MySQL[("MySQL 8.4")]
```

## CI/CD

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) roda em todo push para `main` e em todo Pull Request:

```mermaid
flowchart LR
    Checkout --> Install["npm ci"]
    Install --> Generate["prisma generate"]
    Generate --> Lint["eslint ."]
    Lint --> Format["prettier --check"]
    Format --> Typecheck["tsc --noEmit"]
    Typecheck --> Test["vitest run"]
    Test --> Build["tsc -p tsconfig.build.json"]
```

Todo o pipeline roda com `MOCK_MODE=true` — **não há serviço de MySQL no runner do CI**, de propósito: como a arquitetura já suporta rodar 100% em memória (ver [ARCHITECTURE.md](./ARCHITECTURE.md#o-modo-mock-como-parte-da-arquitetura-não-um-hack-à-parte)), o CI usa exatamente esse caminho, o que o deixa mais rápido e sem depender de infraestrutura externa. O trade-off: o CI hoje **não** exercita o caminho `prismaRepository` de cada módulo (só o `mockRepository`) — um erro específico de uma query Prisma só apareceria em `npm run typecheck` (que valida os tipos gerados) ou em teste manual contra MySQL real, não na suíte automatizada.

🚧 **Não implementado nesta etapa**: deploy automático (CD) a partir do CI — o pipeline hoje só valida (lint/test/build), não publica imagem nem faz deploy. Não há também um job de build/push da imagem Docker no CI.

## Versionamento

- **Da API**: não há versionamento de rota (`/api/v1/...`) nesta etapa — todas as rotas ficam sob `/api` sem número de versão. O documento OpenAPI declara `version: "0.1.0"` (ver [`src/docs/openapi.ts`](../src/docs/openapi.ts)), acompanhando a versão do pacote.
- **Do pacote**: [`package.json`](../package.json) está em `0.1.0` (pré-1.0 — API ainda pode mudar de forma incompatível entre commits, é esperado nesta fase de bootstrap). Segue [SemVer](https://semver.org/) informalmente: quando o projeto estabilizar, `MAJOR.MINOR.PATCH` deve refletir mudança incompatível / funcionalidade nova / correção, respectivamente.
- **Do histórico**: ver [CHANGELOG.md](../CHANGELOG.md) para o que mudou em cada etapa.
- 🚧 Quando a API ganhar consumidores externos além do dashboard/firmware deste mesmo projeto, versionar a rota (`/api/v1`) passa a valer a pena — hoje, com um único frontend controlado pelo mesmo time, o custo não se justifica.
