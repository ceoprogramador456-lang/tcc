# Regra: Chamados (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,9. **Status: PLANEJADO** (sem
entidade, rota ou tabela).

`CHAMADO = solicitação da cliente ("existe um problema/necessidade").`
Pertence ao fluxo de solicitação. Ex: "Sensor da enchedora apresenta falha."

- Chamado e Manutenção **não** são sinônimos (código/docs atuais os confundem).
- Mínimo futuro: `empresaId, solicitanteId, setorId?, ativoId?, sensorId?,
  esp32Id?, titulo, descricao, prioridade, status
  (aberto→em_analise→em_atendimento→concluído/cancelado), operadorId?,
  timestamps, histórico`.
- Quem abre: gestor (funcionário direto ou via gestor NECESSITA DEFINIÇÃO).
  Cliente vê só os próprios; operador vê do escopo; `super_admin` tudo.
