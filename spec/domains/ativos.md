# Domínio: Ativos

**Status: IMPLEMENTADO**

- Entidade/tabela: `Ativo` → `ativo` (`id`, `setor_id`, `nome`, `tag? unique`,
  `tipo?`, `criticidade` default media, `centro_custo?`, `foto_url?`,
  `manual_url?`, `descricao?`, `criado_em`).
- Relações: N-1 `Setor`; 1-N `Sensor`.
- Notas: representa o equipamento (ex: Enchedora 01). Escopo via setor→empresa.
