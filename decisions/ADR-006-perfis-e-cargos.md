# ADR-006 — Perfis (tipo) separados de cargos (função operacional)

**Status:** Accepted

## Contexto

Hoje existem apenas 3 valores em `TipoUsuario` (`super_admin`, `admin_empresa`, `funcionario` — `prisma/schema.prisma:14-20`, `src/types/express.d.ts:7`, validators de user). Não há `operador`, não há campo `cargo` (`grep cargo` = 0 em `src/`), e não há `Empresa.tipo`. Ver `docs/analise-regras-negocio.md` §§3, 5, 6. Ver também `docs/adr/0004-autenticacao-dupla-jwt-xtoken.md` (autenticação, não autorização — não conflita com esta decisão).

## Decisão

- `tipo`/`perfil` = autorização (o que o usuário pode fazer; verificado por `authorize()` nas rotas).
- `cargo` = função operacional (ex.: `mecanico`, `eletricista`), campo informativo sem efeito em `authorize()`.
- Tipos atuais mantidos: `super_admin`, `admin_empresa`, `funcionario`.
- `operador` (empresa vendedora, atendimento técnico) é PLANEJADO — ainda não existe no código.
- Nunca criar `mecanico`/`eletricista` como valores de `TipoUsuario`.

## Motivo

Separar autorização de função operacional evita explosão de perfis e quebra de `authorize()` em todas as rotas a cada novo cargo. `cargo` (ex.: mecânico, eletricista) descreve quem executa a preventiva/inspeção interna; `tipo` descreve o que pode fazer no sistema (§§3, 5, 6 da análise).

## Consequências

- Quando implementado (PLANEJADO): estender `TipoUsuario` com `operador` exige migration + atualização de `express.d.ts` + validators + OpenAPI + `authorize` nas novas rotas de chamados/OS.
- `Usuario.cargo` (PLANEJADO) será campo opcional (`String?`) sem efeito em autenticação/autorização.
- `authorize('operador')` (PLANEJADO) será usado somente em chamados/OS, nunca em preventiva/inspeção interna.

## Alternativas

- **Criar `mecanico`/`eletricista` como perfis (`TipoUsuario`)**: descartado — explosão de perfis; cada novo cargo exigiria revisão de `authorize()` em todas as rotas (§3 da análise).
- **Reaproveitar `funcionario` como operador da vendedora**: descartado — operador não é funcionário de cliente; responsabilidades exclusivas distintas (§6 da análise: operador executa OS, não preventiva interna).
