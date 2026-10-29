# UC: Manutenção preventiva

- **Objetivo**: registrar e concluir atividade preventiva interna do sensor.
- **Ator**: gestor (cria) + funcionário atribuído (executa).
- **Pré-condições**: sensor cadastrado (ativo+ESP32); funcionário da mesma empresa.
- **Fluxo**: gestor `POST /maintenances {tipo: preventiva, sensorId,
  funcionarioId}` → funcionário executa → registra `descricao` →
  `PATCH /maintenances/:id {status: concluido}` (`concluidoEm` derivado).
- **Resultado**: manutenção `concluido`, sem gerar chamado.
- **Regras**: sem chamado obrigatório; gaps atuais — sem `authorize`, sem trava
  de dono, sem agenda. Ver `spec/business-rules/manutencao.md`.
