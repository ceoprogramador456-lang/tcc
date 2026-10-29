# UC: Inspeção

- **Objetivo**: registrar inspeção interna do sensor pelo funcionário.
- **Ator**: gestor (cria) + funcionário atribuído (executa).
- **Pré-condições**: idem preventiva (sensor + funcionário mesma empresa).
- **Fluxo**: idem preventiva com `{tipo: inspecao}`: criar → executar →
  `descricao` → concluir.
- **Resultado**: inspeção `concluido`, sem gerar chamado.
- **Regras**: falta checklist/evidência/resultado estruturado (só `descricao`
  livre). Ver `spec/business-rules/manutencao.md`.
