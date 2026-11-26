# Domínio: Manutenção

**Status: IMPLEMENTADO (escopo interno da empresa cliente)**

- Entidade/tabela: `Manutencao` → `manutencao` (`id`, `sensor_id`, `tipo`
  preventiva|corretiva|inspecao, `status` aberto|em_andamento|concluido,
  `descricao?`, `funcionario_id?`, `aberto_em`, `concluido_em?`;
  índice `[status]`).
- Relações: N-1 `Sensor`; N-1 `Usuario` (executor, `GESTOR` da empresa do sensor).
- Notas: atividade **interna da cliente**, sem chamado obrigatório.
  - Rotas exigem `ADMIN`/`GESTOR`; `TECNICO` da SIVA é bloqueado por `denyTecnico`.
  - O executor (`funcionarioId`) deve ser `GESTOR` ativo da mesma empresa do sensor.
  - Gaps: agenda/recorrência, checklist, evidência, SLA.
- `corretiva` especializada da SIVA trafega via Ordem de Serviço, não por esta
  entidade. Base: `docs/analise-regras-negocio.md` §7.
