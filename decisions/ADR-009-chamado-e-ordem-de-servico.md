# ADR-009 — Chamado (solicitação) × Ordem de Serviço (execução)

**Status:** Proposed

## Contexto

Hoje não existem entidade, rota ou tabela de `Chamado` nem de `OrdemServico` (`grep operador` = 0, só a string `'Chamado de manutenção'` em `src/modules/maintenances/services/maintenance.service.ts:18,31` + docs chamando `maintenances` de "chamados" — [INCONSISTENTE]). Ver `docs/analise-regras-negocio.md` §§9, 10, 11 (Fluxo 3). Nada aqui existe no código: tudo é PLANEJADO.

## Decisão

- `Chamado` = solicitação da cliente ("existe um problema/necessidade"); pertence ao fluxo de solicitação.
- `Ordem de Serviço (OS)` = execução/atendimento técnico da vendedora vinculado ao chamado.
- Fluxo: Chamado → análise → OS → execução → registro do serviço → conclusão.
- `Manutencao` NÃO é sinônimo de `Chamado`; corrigir a string `'Chamado de manutenção'` e os docs que confundem os termos (PLANEJADO).

## Motivo

Separar solicitação (cliente) de execução (vendedora) permite permissões distintas por papel (cliente abre/visualiza os próprios; operador analisa/assume/executa/conclui; ver matriz §12 da análise) e máquinas de estado independentes por entidade, sem sobrecarregar a manutenção interna (§§9, 10 da análise).

## Consequências

- (PLANEJADO) `Chamado` mínimo futuro: `empresaId, solicitanteId, setorId?, ativoId?, sensorId?, esp32Id?, titulo, descricao, prioridade, status (aberto→em_analise→em_atendimento→concluído/cancelado), operadorId?, manutencaoOrigemId?, timestamps, histórico`.
- (PLANEJADO) `OS` mínima futura: `chamadoId, operadorId, descricao_servico, status, iniciadoEm, concluidoEm, laudo/servicoRealizado, custo?`; só `operador/super_admin` criam/assumem/executam/concluem; cliente só visualiza as próprias.
- (PLANEJADO) Máquinas de estado guardadas no service; rotas `/chamados`, `/ordens-servico` com `authorize` e escopo.
- Pontos em ABERTO (ver `memory/pending.md`): 1 chamado → N OS ou 1-1; OS sem chamado permitida (só excepcional?); quem abre o chamado (só gestor ou funcionário direto?); quais chamados o funcionário vê.

## Alternativas

- **Reaproveitar `Manutencao` como chamado (status quo)**: descartado — confunde solicitação com atividade interna, impede permissões distintas e mantém a inconsistência documentada (§19, item 7 da análise).
- **Entidade única "atendimento" fundindo Chamado + OS**: descartado — colapsa dois atores (cliente solicitante × operador executor) e dois ciclos de vida distintos numa só máquina de estado.
