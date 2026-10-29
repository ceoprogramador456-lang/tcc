# ADR-007 — Isolamento multi-empresa: cliente×cliente existente, vendedora×cliente planejada

**Status:** Proposed

## Contexto

Hoje `Usuario.empresaId?` + `assertSameCompany` (`src/shared/auth/scope.ts:9`, usado em `user.service.ts`, `sector.service.ts`, `company.service.ts`) isolam cliente×cliente (padrão deny-by-default) — [EXISTENTE]. Não há `Empresa.tipo` (`vendedora|cliente`), não há vínculo operador→clientes e não há entidade `Chamado`/`OrdemServico` (`grep operador` = 0 em `src/`). Ver `docs/analise-regras-negocio.md` §§4, 13. Referencia `docs/adr/0004-autenticacao-dupla-jwt-xtoken.md` apenas como contexto de autenticação; o isolamento aqui é de autorização por empresa.

## Decisão

- Manter o isolamento cliente×cliente via `assertSameCompany` (existente, sem mudança).
- Relação vendedora×cliente (PLANEJADO): exige `Empresa.tipo` + vínculo operador→empresas clientes + `authorize('operador')` com bypass seletivo nas rotas de chamados/OS.
- Escopo do operador em ABERTO (pendente de definição de negócio — ver `memory/pending.md`): `todas as clientes` vs `somente atribuídas`.

## Motivo

O código atual só conhece dois modos: `super_admin` vê tudo, demais veem uma empresa (§4 da análise). O operador precisa de um terceiro modo (visão transversal às clientes sem ser admin global), o que exige `Empresa.tipo` como base + regra de escopo própria. Sem `Empresa.tipo` não há como distinguir a vendedora das clientes.

## Consequências

- Se decidido `todas` (PLANEJADO): operador herda padrão próximo ao `super_admin` com `authorize('operador')` + bypass seletivo; mais simples, sem tabela nova, porém sem segregação entre operadores.
- Se decidido `atribuídas` (PLANEJADO): exige tabela M-N nova (ex.: vínculo operador×empresas) + função de escopo (ex.: `assertOperadorEscopo`) + filtros por lista em chamados/OS.
- Recomendação registrada na análise (§4), sem arbitrariedade: começar com `todas` + auditoria, evoluir para `atribuídas` quando houver necessidade real de segregação entre operadores — decisão final pendente.

## Alternativas

- **Tratar operador como `super_admin`**: descartado — daria ao operador CRUD de empresas e `DELETE /users/:id`, fora de sua responsabilidade (atendimento técnico).
- **Isolar operador a uma única `empresaId` como cliente comum**: descartado — impediria o atendimento transversal a várias clientes, que é a raison d'être do papel.
- **Vínculo operador×clientes desde o dia 1 (só `atribuídas`)**: possível, mas custo maior (tabela + escopo + quem atribui + visibilidade do gestor) sem necessidade comprovada; mantido como evolução futura.
