# Regra: Multi-empresa (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,4.

## Existe

Isolamento **cliente×cliente** via `assertSameCompany`
(`src/shared/auth/scope.ts`) + deny-by-default (`?? -1`): `super_admin` vê
tudo, demais só a própria empresa.

## Planejada (vendedora×cliente)

- `Empresa.tipo (vendedora|cliente)` + vínculo operador→clientes.
- Escopo do operador NECESSITA DEFINIÇÃO: todas as clientes (coerente de
  imediato, herda padrão super_admin) vs atribuídas (exige M-N nova +
  `assertOperadorEscopo`). Recomendação registrada: começar com todas +
  auditoria, evoluir se houver necessidade real de segregação.
