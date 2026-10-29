# Arquitetura: autorização

- **Estado atual**: duas camadas — `authorize(...papéis)` (grosseira, na rota)
  + `assertSameCompany` (fina, no service). 3 papéis: super_admin, admin_empresa,
  funcionario. **Gap conhecido**: `maintenances` sem `authorize` (qualquer
  autenticado escreve; funcionário altera atividade alheia) e
  `company.service create/update/remove` sem `actor` (defesa só na rota).
  Detalhe: `docs/AUTHENTICATION.md`, `docs/analise-regras-negocio.md` §13.
- **Estado planejado**: `authorize('operador')` só em chamados/OS; travas de
  dono em manutenções (`funcionarioId==me`/gestor); `company.service` com
  `actor`; travas cruzadas (funcionário↔OS, operador↔preventiva, cliente↔OS).
