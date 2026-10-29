# Arquitetura: backend (camadas)

- **Estado atual**: `Route → Middleware (auth → authorize → validate) →
  Controller → Service → Repository → Prisma → MySQL`, com `MOCK_MODE=true`
  trocando Prisma por `MockCollection` via contrato `CrudRepository` sem tocar
  em regra. Regra no service (`assertSameCompany`, `getAccessible`); repository
  sem regra; controller fino (`asyncHandler` + envelope). 10 módulos:
  auth, users, companies, sectors, assets, devices, sensors, readings,
  maintenances, alerts (stub 501). Detalhe: `docs/ARCHITECTURE.md`.
- **Estado planejado**: mesmos papéis de camada para `chamados`/`ordens-servico`;
  corrigir `maintenances` (adicionar `authorize` + trava de dono); `company.service`
  receber `actor`; revalidar FK destino em `update`.
