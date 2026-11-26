# Regra: Manutenção interna (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,7 + implementação de 2026-11-26.

`MANUTENÇÃO = atividade interna da empresa cliente, executada pelo GESTOR da própria empresa.`

- Atividade **interna da cliente**, atribuída a um usuário, concluída **sem
  gerar chamado por obrigação**.
- `GESTOR` cria com `funcionarioId` → executor registra `descricao` → conclui.
- O executor deve ser `GESTOR` `ATIVO` da mesma empresa do sensor; o antigo
  técnico da cliente deixou de existir (técnico agora é exclusivo da SIVA).
- `TECNICO` da SIVA não acessa manutenções (`403` via `denyTecnico`).
- `corretiva` especializada da SIVA vai via Ordem de Serviço.
- Lacunas: agenda/recorrência, checklist, evidência, SLA, filtros globais.
