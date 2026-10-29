# Runbook — Guia de Operação

Guia prático para quando algo dá errado. Assume a topologia descrita em [DEPLOYMENT.md](./DEPLOYMENT.md) (`docker-compose.enterprise.yml`: Caddy → API → MySQL). Nesta etapa do projeto não há orquestração (Kubernetes), balanceador com múltiplas réplicas, nem automação de backup — os passos abaixo são o "manual", não um script.

## Serviço fora do ar

**Sintoma**: `curl https://<domínio>/api/health` não responde ou dá timeout/connection refused.

1. Confirme se o container da API está de pé: `docker compose -f docker-compose.enterprise.yml ps`.
2. Se estiver parado, veja por que morreu: `docker compose -f docker-compose.enterprise.yml logs api --tail=200`. Causas comuns:
   - `DATABASE_URL` incorreta ou MySQL inacessível no boot (a API falha o boot se `MOCK_MODE=false` e não conseguir validar `env` — ver [`config/env.ts`](../src/config/env.ts); note que a validação hoje checa só a *presença* de `DATABASE_URL`, não conectividade real).
   - `JWT_SECRET`/`MYSQL_ROOT_PASSWORD` não exportados — o compose enterprise se recusa a subir sem eles (`${VAR:?...}`).
   - OOM (container matado por falta de memória) — checar `docker stats` / `dmesg`.
3. Suba de novo: `docker compose -f docker-compose.enterprise.yml up -d api`.
4. Se o processo está de pé mas não escuta na porta, confira se `PORT`/o mapeamento do Caddy batem (`Caddyfile` aponta para `api:3000`).

## Serviço fora do ar — respondendo, mas com erro

**Sintoma**: `/api/health` responde `200`, mas as rotas de negócio devolvem `500`.

Lembre-se: o health check atual **não valida o MySQL** (ver [OBSERVABILITY.md](./OBSERVABILITY.md#health-check)) — é possível a API estar "viva" com o banco fora do ar. Verifique:

1. Logs da API por erro do Prisma: `docker compose logs api --tail=200 | grep -i prisma`.
2. Conectividade direta com o MySQL: `docker compose exec mysql mysqladmin ping -h localhost -uroot -p`.
3. Se o MySQL caiu, reinicie-o (`docker compose restart mysql`) — a API não reconecta sozinha instantaneamente em todo cenário; se os erros persistirem após o MySQL voltar, reinicie a API também.

## Banco de dados indisponível

1. Cheque o container: `docker compose ps mysql` / `docker compose logs mysql`.
2. Espaço em disco é a causa mais comum de MySQL travar/não subir: `df -h` no host.
3. Se o volume (`siva_mysql_data`) estiver corrompido e não for possível recuperar, o último recurso é restaurar de um backup (ver seção abaixo) — não existe hoje um MySQL gerenciado/replicado, então não há failover automático.

## Reinício da aplicação

Sem downtime de banco (só a API):

```bash
docker compose -f docker-compose.enterprise.yml restart api
```

Como é uma única réplica sem orquestrador, **isso causa uma janela curta de indisponibilidade** — não há rolling restart nesta topologia. 🚧 Se isso passar a importar, é argumento para migrar para uma plataforma com múltiplas réplicas (ECS, Kubernetes, etc.), fora do escopo desta etapa.

## Rollback

Não há pipeline de deploy automatizado nesta etapa (ver [DEPLOYMENT.md](./DEPLOYMENT.md#cicd) — o CI só valida, não publica/faz deploy). Rollback manual:

```bash
git checkout <commit-ou-tag-anterior>
docker compose -f docker-compose.enterprise.yml up -d --build api
```

Se o commit que está sendo revertido incluiu uma migration de banco (`prisma/migrations/`), o rollback do **código** não desfaz o schema — avalie se a migration é retrocompatível antes de reverter só a aplicação. Prisma não gera migration de "descer" automaticamente; reverter uma alteração de schema é uma migration nova, escrita manualmente, que desfaz a anterior.

## Recuperação de backup

⚠️ **Não há rotina de backup automatizada neste repositório** — é responsabilidade de quem opera o MySQL de produção (snapshot do volume, `mysqldump` agendado, backup gerenciado se usar um provedor cloud). Quando existir um backup:

```bash
# Dump manual (fazer isso proativamente, não só na hora do incidente)
docker compose exec mysql mysqldump -uroot -p siva_db > backup.sql

# Restaurar
docker compose exec -T mysql mysql -uroot -p siva_db < backup.sql
```

Depois de restaurar, rode `npm run prisma:deploy` para garantir que o schema do banco restaurado está alinhado com as migrations esperadas pela versão da API que está rodando.

## Rotação de chaves (`JWT_SECRET`)

Trocar `JWT_SECRET` **invalida instantaneamente todos os JWTs emitidos antes da troca** (não há período de graça com dois segredos válidos simultaneamente nesta implementação) — todo usuário logado precisa logar de novo. Use isso a favor em caso de suspeita de vazamento do segredo:

1. Gere um novo valor (ex.: `openssl rand -base64 48`).
2. Atualize a variável de ambiente (`JWT_SECRET`) no ambiente de produção.
3. Reinicie a API (ver seção acima).
4. Comunique aos usuários que vão precisar logar novamente.

Rotação de `token` de um ESP32 específico (sem o gap de suspeita de vazamento geral): não há endpoint de "regenerar token" — hoje a única forma é remover o dispositivo (`DELETE /api/devices/:id`) e recriá-lo (`POST /api/devices`), o que também exige reconfigurar o firmware daquele ESP32 com o novo token.

## Resposta a incidente (checklist geral)

1. **Confirme o impacto**: quais rotas/usuários afetados, desde quando (usar `requestId` e timestamps do log — ver [OBSERVABILITY.md](./OBSERVABILITY.md)).
2. **Contenha**: se for um ataque (ex.: brute-force de login, abuso do rate limit), considere bloquear o IP/origem na camada do Caddy ou de um firewall à frente dele — a API não tem bloqueio dinâmico de IP embutido.
3. **Corrija ou reverta**: aplique um fix ou faça rollback (seção acima).
4. **Valide**: `curl /api/health` + um fluxo real (login + uma rota autenticada) antes de considerar resolvido.
5. **Registre**: já que não há audit log automatizado (ver [SECURITY.md](./SECURITY.md#logs-e-auditoria)), documente manualmente o que aconteceu, causa raiz e ação tomada — isso também alimenta um futuro [ADR](./adr/README.md) se a causa raiz apontar para uma decisão de arquitetura a revisar.
