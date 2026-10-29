# UC: Abertura de chamado — PLANEJADO

- **Objetivo**: cliente solicita atendimento técnico à vendedora.
- **Ator**: gestor da cliente (funcionário direto NECESSITA DEFINIÇÃO).
- **Pré-condições**: entidade `Chamado` implementada; usuário da empresa cliente.
- **Fluxo (futuro)**: problema detectado → cliente abre chamado
  (`titulo, descricao, prioridade`, origem opcional setor/ativo/sensor/esp32) →
  status `aberto` → operador recebe/analisa.
- **Resultado**: chamado `aberto` visível à vendedora do escopo.
- **Regras**: cliente vê só os próprios; operador nunca é o solicitante
  principal. Ver `spec/business-rules/chamados.md`.
