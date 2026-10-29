# Regra: Manutenção interna (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,7.

`MANUTENÇÃO = funcionário da cliente + preventiva/inspeção + atividade atribuída.`

- Atividade **interna da cliente**, atribuída a funcionário, concluída **sem
  gerar chamado por obrigação** (EXISTENTE parcial).
- Gestor cria com `funcionarioId` → funcionário executa → registra `descricao`
  → conclui via `PATCH status`.
- `corretiva` em sensor pelo funcionário existe como valor, mas corretiva
  especializada vai via Chamado→OS; uso interno de `corretiva` simples
  NECESSITA DEFINIÇÃO.
- Lacunas: agenda/recorrência, checklist, evidência, SLA, dono, filtros globais.
