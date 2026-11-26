# Segurança

Este documento é deliberadamente honesto: lista o que está implementado **e** os gaps conhecidos, para que quem for evoluir o projeto (ou avaliar o TCC) tenha o retrato real, não um checklist de marketing. Itens marcados com ⚠️ são recomendações para antes de qualquer deploy com dado de verdade.

## Rate Limiting

- Implementado: `express-rate-limit` global, aplicado a **todas** as rotas (`src/app.ts`), configurável via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` (default: 100 requisições/minuto por IP).
- ⚠️ **Gap**: não há limite específico para `POST /api/auth/login`. O limite genérico não impede um brute-force lento e distribuído contra a senha de um usuário específico, e não há bloqueio de conta após N tentativas falhas.
- O compose de produção define `TRUST_PROXY_HOPS=1` para o Caddy e mantém a API na rede privada. Em uma instalação sem proxy, use o padrão `0`.

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

## Credenciais de dispositivo

A API verifica o hash SHA-256 da credencial e a revogação antes de aceitar leituras. A entrega pelo endpoint de retirada exige o segredo temporário da placa e HTTPS em produção. Códigos de confirmação expiram e têm tentativas limitadas. [Pareamento, configuração e revogação](PAREAMENTO_ESP32.md)

O stream de dispositivos exige JWT no cabeçalho `Authorization`. A API confere papel e empresa ao enviar eventos e encerra a conexão se a autorização expirar ou mudar. As notificações contêm apenas o tipo do evento e um objeto vazio. Os dados do equipamento vêm das rotas REST com as permissões habituais.

## Segredos de produção

Configure `JWT_SECRET` com um segredo aleatório de produção e `PAIRING_KEY` com 32 bytes aleatórios em hexadecimal. Guarde as duas chaves fora do repositório. A API usa a primeira para autenticar usuários e a segunda para o pareamento. [Configuração](PAREAMENTO_ESP32.md)

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
| Proxy confiável | Um salto no compose com Caddy, API em rede privada |
| Helmet | ✅ implementado (config padrão) |
| CORS configurável | ✅ implementado |
| Validação de entrada (Zod) em toda rota | ✅ implementado |
| SQL Injection (Prisma parametrizado) | ✅ mitigado por padrão |
| XSS (API só JSON) | ✅ não aplicável nesta camada |
| Senha com hash forte (bcrypt) | ✅ implementado |
| Token de dispositivo com hash | SHA-256 e revogação por dispositivo |
| `esp32.token_hash` único | ✅ implementado |
| `JWT_SECRET` de produção | Configuração específica da instalação |
| Isolamento entre empresas (leitura/escrita) | ✅ implementado |
| Isolamento entre empresas (não vazar existência via 403 vs 404) | ⚠️ gap conhecido |
| Erros inesperados não vazam stack em produção | ✅ implementado |
| Erros de banco não mascarados como 404 | ⚠️ gap conhecido |
| Revogação de JWT | 🚧 não implementado |
| MFA/2FA | 🚧 não implementado |
| Auditoria (audit log) | 🚧 não implementado |
