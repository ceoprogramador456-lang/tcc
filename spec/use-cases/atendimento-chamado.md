# UC: Atendimento de chamado — PLANEJADO

- **Objetivo**: vendedora tria e assume a solicitação do cliente.
- **Ator**: operador (vendedora) / super_admin.
- **Pré-condições**: chamado `aberto`; operador no escopo.
- **Fluxo (futuro)**: operador visualiza → analisa (`em_analise`) → assume
  (`em_atendimento`, `operadorId`) → gera OS.
- **Resultado**: chamado em atendimento com responsável definido.
- **Regras**: gestor/funcionário cliente nunca analisam/assumem; operador nunca
  gerencia preventiva interna. Ver `spec/business-rules/chamados.md`.
