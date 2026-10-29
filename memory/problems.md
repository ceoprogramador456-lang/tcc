# Problems

Base: `docs/analise-regras-negocio.md` §19. Status único: Pendente.

## PROB-001 — `maintenances` sem `authorize` / sem dono
- Descrição: rotas de escrita sem `authorize`; service não checa `funcionarioId == me` nem papel gestor.
- Impacto: funcionário altera atividade de outro da mesma empresa.
- Status: Parcialmente resolvido 2026-10-13 — `funcionarioId` agora validado (existe, ATIVO,
  mesma empresa do sensor). Falta: dono (`== me`) e `authorize` na rota.

## PROB-002 — `company.service` sem actor
- Descrição: service não recebe ator/escopo para checagem de vínculo.
- Impacto: regra de isolamento fora do service, risco de bypass.
- Status: Pendente. Nota 2026-10-21: o front-end depende do `authorize('ADMIN')` da rota
  para escrita em empresas (a tela só existe para ADMIN) — se a rota mudar, o front segue
  funcionando e o back-end precisa manter a barreira.

## PROB-003 — `update` sem revalidar FK destino
- Descrição: troca de `empresaId`/`funcionarioId` no update não revalida vínculo destino.
- Impacto: registro pode migrar para empresa indevida.
- Status: Pendente. Nota 2026-10-21: o front-end de edição de usuário envia a combinação
  completa (tipo + empresa + especialidade) justamente para não depender dessa revalidação.

## PROB-004 — "Chamado de manutenção" confunde com Chamado
- Descrição: manutenção interna usa rótulo de chamado; solicitação da cliente (Chamado) não existe como entidade.
- Impacto: fluxos interno vs atendimento misturados.
- Status: Pendente.

## PROB-005 — `alerts` 501 sem ocorrência
- Descrição: endpoint de alertas não implementado; nada gera ocorrência automática.
- Impacto: Fluxo 3 (atendimento) sem gatilho automático.
- Status: Pendente.

## PROB-006 — Token ESP32 em texto plano + `JWT_SECRET` default
- Descrição: `device.token` gravado sem hash; secret com fallback inseguro.
- Impacto: vazamento de token/secret compromete ingestão e sessões.
- Status: Parcial 2026-10-13: INATIVO bloqueado no login/`/me`, mas JWT emitido
  antes da inativação segue válido até expirar (sem revogação — stateless).
  **Token do ESP32 resolvido em 2026-10-21**: `esp32.token` → `esp32.token_hash` (SHA-256),
  gerado com `randomBytes(24)`, devolvido em claro **só na criação** e nunca mais exposto
  (migration `db/migrations/002_device_token_hash.sql`). O `JWT_SECRET` com default inseguro
  **segue pendente**.

## PROB-007 — `db.sql` × schema sem migration
- Descrição: duas fontes de verdade, sem migration inicial unificada.
- Impacto: deriva de schema entre ambientes.
- Status: Parcial 2026-10-13 — criada `db/migrations/001_roles_status.sql` (conversão de
  roles + especialidade + status). Falta: adotar Prisma Migrate como fonte única.

## PROB-008 — `GET /companies/:id/details` não devolve dispositivos
- Descrição: o service calcula o array `dispositivos` (ESP32 por setor) mas o retorno
  contém apenas `{empresa, funcionarios, setores, resumo}`.
- Impacto: a tela "Ver mais" da empresa não mostra os ESP32; o front contorna buscando
  `GET /devices?setorId=` por setor (N+1, mesmo padrão usado internamente pelo back-end).
- Status: Pendente (lacuna do back-end, registrada 2026-10-21).

## PROB-009 — `GET /assets` e `GET /devices` exigem `setorId`
- Descrição: não existe listagem global de ativos nem de dispositivos; a query string
  torna `setorId` obrigatório.
- Impacto: toda seleção de ativo/ESP32 no front vira cascata `empresa → setor → ativo/ESP32`
  (N+1). Para resolver nomes na listagem de sensores é preciso carregar o catálogo inteiro.
- Status: **Resolvido 2026-10-21** — `setorId` passou a ser opcional e `?empresaId=` foi
  adicionado a `GET /assets`, `GET /devices` e `GET /sensors`, sempre escopado pela empresa do
  usuário (`assertSameCompany` para quem não é ADMIN). O filtro `{ in: [...] }` foi unificado
  entre Prisma e mock (`src/utils/id-filter.ts`).

## PROB-010 — Empresa sem inativação
- Descrição: só existe `DELETE` físico para empresas; usuários têm `PATCH /:id/status`.
- Impacto: o front não consegue "desativar" uma empresa sem perder o histórico — apenas
  excluir (que retorna 409 se houver vínculo).
- Status: Pendente (lacuna do back-end, registrada 2026-10-21).

## PROB-011 — `PATCH /users/:id` valida a combinação só no service
- Descrição: o `updateUserSchema` (Zod) só valida a combinação quando `tipo` e os
  correlatos chegam juntos; a validação da combinação final fica no service.
- Impacto: trocar só o `tipo` passa pelo Zod e quebra no service. O front contorna
  enviando sempre a combinação completa.
- Status: Pendente (lacuna do back-end, registrada 2026-10-21; já notada no
  `RELATORIO_BACKEND_FRONTEND.md` §8.8).

## PROB-012 — Rate limit global de 100 req/min por IP
- Descrição: `express-rate-limit` com `RATE_LIMIT_MAX=100` por janela de 60 s, aplicado a
  todas as rotas (inclusive `/docs` e `/api/health`), sem exceção para o front.
- Impacto: em desenvolvimento e em suítes automatizadas o limite estoura com facilidade e
  derruba a sessão. O front já trata o 429 com mensagem própria.
- Status: Pendente. Sugestão: limite maior por origem do front ou exemption para `/api/auth/login`.

## PROB-013 — Sessão do front em `localStorage` (exposição a XSS)
- Descrição: o back-end emite JWT stateless sem cookie e sem refresh token; o front
  persiste o token em `localStorage` para a sessão sobreviver a recarregamentos.
- Impacto: um XSS no front exfiltraria o token. O JWT não carrega dado sensível
  (`id`, `email`, `tipo`, `empresaId`) e a janela é de 8 h, mas não há revogação.
- Status: Aceito conscientemente 2026-10-21 (alternativas avaliadas: `sessionStorage` e
  memória — perdem a sessão ao recarregar; cookie exigiria mudança de contrato no back-end).
  Reavaliar junto da adoção de refresh token / httpOnly cookie.
