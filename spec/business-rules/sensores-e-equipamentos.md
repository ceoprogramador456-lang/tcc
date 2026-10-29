# Regra: Sensores × equipamentos (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,8.

- **Funcionário (cliente)**: inspeção e preventiva do **sensor**; escopo =
  `Manutencao` interna.
- **Vendedora/operador**: **ESP32, LCD, comunicação** e atendimento
  especializado; veículo = **Chamado → OS**, não manutenção interna.
- **NÃO adotar `Manutencao.alvo = sensor|esp32|lcd|comunicacao` como
  obrigatório**: duplica Chamado/OS, reabre trava por perfil em todo CRUD,
  polui o fluxo interno, e o rastro fica melhor em `Chamado.local +
  OS.servico`. Se um dia for preciso distinguir defeito do ponto de medição vs
  falha de telemetria na manutenção interna, adicionar campo opcional com
  justificativa — o padrão continua Chamado→OS.
