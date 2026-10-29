# Arquitetura: multi-tenancy

- **Estado atual**: isolamento **cliente×cliente** deny-by-default:
  `assertSameCompany(user, empresaId)` + `?? -1`; `super_admin`
  (`empresaId=null`) bypassa; cadeia `getAccessible` nos services.
  Detalhe: `src/shared/auth/scope.ts`, `docs/AUTHENTICATION.md`.
- **Estado planejado**: isolamento **vendedora×clientes** via `Empresa.tipo` +
  `operador` (todas as clientes + auditoria primeiro; atribuídas via M-N +
  `assertOperadorEscopo` se segregação for necessária). Escopo final
  NECESSITA DEFINIÇÃO. Base: `docs/analise-regras-negocio.md` §4.
