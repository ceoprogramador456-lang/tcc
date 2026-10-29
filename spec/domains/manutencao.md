# Domínio: Manutenção

**Status: PARCIAL**

- Entidade/tabela: `Manutencao` → `manutencao` (`id`, `sensor_id`, `tipo`
  preventiva|corretiva|inspecao, `status` aberto|em_andamento|concluido,
  `descricao?`, `funcionario_id?`, `aberto_em`, `concluido_em?`;
  índice `[status]`).
- Relações: N-1 `Sensor`; N-1 `Usuario` (funcionário responsável).
- Notas: atividade **interna da cliente**, sem chamado obrigatório. Gaps: rotas
  sem `authorize`, sem trava de dono, `funcionarioId` sem checar mesma empresa,
  sem agenda/checklist. `corretiva` interna simples NECESSITA DEFINIÇÃO
  (especializada vai via Chamado→OS). Base: `docs/analise-regras-negocio.md` §7.
