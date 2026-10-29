# Domínio: Ordens de Serviço

**Status: PLANEJADO**

- Entidade/tabela: nenhuma (`grep OrdemServico` em `src/` = 0).
- Relações (futuras): N-1 `Chamado` (`chamadoId`), N-1 `Usuario`
  (`operadorId`).
- Notas: atendimento técnico da **vendedora** vinculado ao chamado
  (Chamado → análise → OS → execução → laudo → conclusão). 1-N vs 1-1 e OS sem
  chamado NECESSITAM DEFINIÇÃO. Base: `docs/analise-regras-negocio.md` §10.
