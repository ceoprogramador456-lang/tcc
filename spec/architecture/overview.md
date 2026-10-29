# Arquitetura: visão geral

- **Estado atual**: monólito modular Node.js/Express 5 + TypeScript ESM,
  feature-modular por recurso, processo único. Fluxo:
  `HTTP → middlewares globais → routes → auth → validate → controller →
  service → repository → Prisma→MySQL (ou mock em memória)`.
  Detalhe: `docs/ARCHITECTURE.md`.
- **Estado planejado**: sem mudança de estilo (sem microsserviços/filas);
  adicionar módulos `chamados` e `ordens-servico` no mesmo padrão, mais
  `operador`/`cargo`/`Empresa.tipo`.
