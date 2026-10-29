# UC: Ordem de serviço — PLANEJADO

- **Objetivo**: executar e registrar o atendimento técnico vinculado ao chamado.
- **Ator**: operador (vendedora) / super_admin.
- **Pré-condições**: chamado em atendimento; entidade `OrdemServico` implementada.
- **Fluxo (futuro)**: OS criada a partir do chamado → operador executa →
  registra serviço/laudo (`descricao_servico, servicoRealizado, custo?`) →
  conclui OS (+ fecha chamado).
- **Resultado**: OS concluída com laudo; chamado concluído.
- **Regras**: só operador/super_admin criam/executam/concluem; cliente só
  visualiza as próprias. Ver `spec/business-rules/ordens-servico.md`.
