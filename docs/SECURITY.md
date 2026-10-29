# Segurança

Este documento é deliberadamente honesto: lista o que está implementado **e** os gaps conhecidos, para que quem for evoluir o projeto (ou avaliar o TCC) tenha o retrato real, não um checklist de marketing. Itens marcados com ⚠️ são recomendações para antes de qualquer deploy com dado de verdade.

## Rate Limiting

- Implementado: `express-rate-limit` global, aplicado a **todas** as rotas (`src/app.ts`), configurável via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` (default: 100 requisições/minuto por IP).
- ⚠️ **Gap**: não há limite específico para `POST /api/auth/login`. O limite genérico não impede um brute-force lento e distribuído contra a senha de um usuário específico, e não há bloqueio de conta após N tentativas falhas.
- ⚠️ **Gap**: o app nunca chama `app.set('trust proxy', ...)`. Atrás de um reverse proxy (o `Caddyfile`/`docker-compose.enterprise.yml` deste repo colocam um na frente), `req.ip` passa a ser sempre o IP do proxy, não o do cliente — o rate limit vira, na prática, um balde único compartilhado por todos os usuários reais. Precisa ser corrigido antes de usar essa topologia em produção.

## Helmet

- Implementado: `helmet()` com a configuração padrão (headers como `X-Content-Type-Options`, `X-Frame-Options`, remoção de `X-Powered-By` via `app.disable('x-powered-by')`).
- Não há uma Content-Security-Policy customizada — aceitável hoje porque a API não serve HTML/JS de aplicação (só o Swagger UI estático em `/docs`), mas vale revisar se isso mudar.

## CORS

- Implementado: `cors()` lendo `CORS_ORIGIN` do ambiente. `CORS_ORIGIN=*` (default) reflete qualquer origem (`origin: true`); em produção, configure uma lista explícita separada por vírgula.
- Como a autenticação é via header `Authorization`/`X-Token` (não cookie), não há superfície de CSRF clássica — um site malicioso não consegue "andar de carona" na sessão do usuário, porque não existe sessão baseada em cookie.

## Injeção (SQL Injection)

- Toda consulta passa pelo Prisma Client, que parametriza automaticamente — não há SQL concatenado manualmente em nenhum repository. Risco de SQLi tradicional é baixo enquanto essa disciplina for mantida (nunca usar `$queryRawUnsafe` com interpolação de string).

## XSS

- A API só devolve JSON (`Content-Type: application/json`), nunca renderiza HTML com dado do usuário — a superfície de XSS refletido/armazenado pertence ao frontend que consumir esses dados, não a este backend.

## Validação de entrada

- Implementado: todo `body`/`params`/`query` de toda rota passa por um schema Zod (`validate` middleware) antes de chegar no controller — inclusive coerção de tipo (`z.coerce.number()` em IDs/paginação). Payload fora do schema nunca chega a tocar em repository.

## Senhas

- Implementado: `bcryptjs`, 10 salt rounds, nunca a senha em claro. O campo `senha` é explicitamente removido antes de qualquer resposta (`toPublicUser`).
- Sem política de complexidade de senha além do mínimo de 8 caracteres (`z.string().min(8)`).
- 🚧 Sem MFA/2FA, sem expiração de senha, sem histórico de senhas usadas.

## Credenciais de dispositivo (X-Token)

- ✅ **Resolvido 2026-10-21**: o `token` do ESP32 não é mais gravado em texto plano. A coluna
  passou a ser `esp32.token_hash CHAR(64)` (SHA-256 do token) e o token em claro **só é
  devolvido na resposta de criação** (`POST /api/devices`). O `authenticateDevice` calcula o
  hash do `X-Token` recebido e busca pelo hash — um vazamento do banco não permite mais forjar
  um header válido. Migration: `db/migrations/002_device_token_hash.sql`.
- O token é gerado com `randomBytes(24)` (`crypto`), em base64url — ~192 bits de entropia.
  Antes era `Math.random()`, que é previsível. Prefixo `dev-` mantido para suporte.
- O hash também é sensível: `toPublicDevice` o remove da representação pública, então nem
  o hash sai do back-end.
- O token não expira e não pode ser rotacionado via API (só recriando o dispositivo). A
  edição de um dispositivo **nunca** gera um token novo.
- Limitação restante: o `X-Token` é de conhecimento do dispositivo — quem o obtiver pode
  injetar leituras. Uma rotação programável e expiração continuam fora do escopo.

## Segredos (JWT_SECRET)

- ⚠️ **Gap grave**: [`src/config/env.ts`](../src/config/env.ts) define um valor **padrão e público** para `JWT_SECRET` (`troque-este-valor-em-producao`, o mesmo texto que está no `.env.example` deste repositório). Nada no código impede a API de subir em `NODE_ENV=production` sem essa variável explicitamente definida. Se isso acontecer, qualquer pessoa que leia o repositório consegue forjar um JWT válido de `super_admin`.
  - **Mitigação recomendada**: falhar o boot (`process.exit(1)` ou lançar na validação do `env.ts`) quando `NODE_ENV=production` e `JWT_SECRET` não foi setado explicitamente (hoje o schema Zod não diferencia "não setado, caiu no default" de "setado igual ao default").

## Isolamento entre tenants

- Implementado: toda leitura/escrita passa por `assertSameCompany` ou por uma cadeia de `getAccessible` que sobe até a empresa (ver [AUTHENTICATION.md](./AUTHENTICATION.md#autorização-por-papel-roles)). Um `admin_empresa`/`funcionario` nunca lê nem escreve dado de outra empresa.
- ⚠️ **Gap (oráculo de existência / IDOR-adjacent)**: o padrão usado em todo `getAccessible` é *buscar o recurso por ID em qualquer empresa* e só depois decidir `404` (não existe) ou `403` (existe, mas não é seu). Isso deixa qualquer usuário autenticado descobrir, por tentativa, quais IDs de setor/ativo/ESP32/sensor **existem** em empresas concorrentes — mesmo sem conseguir ler o conteúdo. Multi-tenant mais rígido devolveria `404` nos dois casos. Não corrigido nesta etapa porque muda a semântica de erro esperada pelo frontend; fica registrado como próximo passo.

## Tratamento de erro e vazamento de informação

- Erros de negócio (`AppError` e subclasses) devolvem mensagem e código estáveis, pensados para o cliente. Erros inesperados devolvem `"Erro interno do servidor."` em produção (`isProduction` checado em [`error-handler.middleware.ts`](../src/middlewares/error-handler.middleware.ts)) e só expõem a mensagem crua fora de produção — stack trace nunca vai para o cliente, só para o log. Ver [ERROR_HANDLING.md](./ERROR_HANDLING.md).
- ⚠️ **Gap de robustez (não é exposição, é mascaramento)**: os métodos `update`/`remove` de todo repository Prisma engolem **qualquer** exceção num `catch { return null }` / `catch { return false }`, para converter "registro não encontrado" em `404`. Isso também engole erros reais (conexão caída, violação de constraint) sem logar nada — o service recebe `null`/`false` e devolve `404` como se fosse um caso normal. Deveria distinguir o erro do Prisma esperado (`P2025 — Record not found`) dos demais, relançando o resto.

## Tokens JWT sem revogação

- Não há blacklist/allowlist de tokens nem versionamento de sessão (`tokenVersion` no usuário, por exemplo, invalidaria tokens antigos ao trocar a senha). A cada requisição protegida, o back-end relê o usuário e aplica status, papel e empresa atuais; excluir ou inativar a conta bloqueia os JWTs existentes, e mudanças de papel/empresa são imediatas. Troca de senha, por si só, não invalida tokens já emitidos. Logout continua sendo apenas o descarte do token no cliente.

## Logs e auditoria

- Implementado: log estruturado por requisição (Pino), incluindo `requestId`, método, URL, status e duração — ver [OBSERVABILITY.md](./OBSERVABILITY.md). Não há log de payload (corpo da requisição não é logado), o que evita logar senha/token sem querer.
- 🚧 **Não implementado**: trilha de auditoria (quem alterou o quê, quando) além do log genérico de requisição. Não há tabela `audit_log`.

## Checklist resumido

| Controle | Status |
| --- | --- |
| Rate limit global | ✅ implementado |
| Rate limit específico de login / lockout de conta | 🚧 não implementado |
| `trust proxy` correto atrás de reverse proxy | ⚠️ não configurado |
| Helmet | ✅ implementado (config padrão) |
| CORS configurável | ✅ implementado |
| Validação de entrada (Zod) em toda rota | ✅ implementado |
| SQL Injection (Prisma parametrizado) | ✅ mitigado por padrão |
| XSS (API só JSON) | ✅ não aplicável nesta camada |
| Senha com hash forte (bcrypt) | ✅ implementado |
| Token de dispositivo com hash | ⚠️ texto plano hoje |
| `esp32.token` único | ✅ implementado |
| `JWT_SECRET` obrigatório em produção | ⚠️ tem default inseguro |
| Isolamento entre empresas (leitura/escrita) | ✅ implementado |
| Isolamento entre empresas (não vazar existência via 403 vs 404) | ⚠️ gap conhecido |
| Erros inesperados não vazam stack em produção | ✅ implementado |
| Erros de banco não mascarados como 404 | ⚠️ gap conhecido |
| Revogação de JWT | 🚧 não implementado |
| MFA/2FA | 🚧 não implementado |
| Auditoria (audit log) | 🚧 não implementado |
