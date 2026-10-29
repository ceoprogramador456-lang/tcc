# Domínio: Chamados

**Status: PLANEJADO**

- Entidade/tabela: nenhuma (sem model, rota ou tabela; só string legada
  `'Chamado de manutenção'` em `maintenance.service.ts`).
- Relações (futuras): N-1 `Empresa` (cliente), solicitante, origem opcional
  (setor/ativo/sensor/esp32), operador responsável.
- Notas: solicitação da cliente ("existe um problema/necessidade"); pertence ao
  fluxo de solicitação, não à manutenção interna. Mínimo futuro e máquina de
  estado em `spec/business-rules/chamados.md`. Base:
  `docs/analise-regras-negocio.md` §9.
