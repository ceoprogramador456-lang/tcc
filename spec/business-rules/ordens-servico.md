# Regra: Ordens de Serviço (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,10. **Status: PLANEJADO** (grep = 0).

`OS = atendimento técnico da vendedora vinculado ao chamado.`
Ex: "Verificar comunicação do ESP32, diagnosticar, substituir, testar."

- Fluxo: Chamado → análise → OS → operador executa → serviço registrado → OS
  concluída (+ fecha chamado).
- Mínimo futuro: `chamadoId, operadorId, descricao_servico, status, iniciadoEm,
  concluidoEm, laudo/servicoRealizado, custo?`.
- Só `operador/super_admin` criam/assumem/executam/concluem; cliente só
  visualiza as próprias. 1 chamado→N OS e OS sem chamado NECESSITAM DEFINIÇÃO.
