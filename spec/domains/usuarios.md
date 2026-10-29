# Domínio: Usuários

**Status: IMPLEMENTADO**

- Entidade/tabela: `Usuario` → `usuario` (`id`, `nome`, `email unique`, `senha`
  hash, `tipo`, `especialidade?`, `status`, `empresa_id?`, `criado_em`).
- Relações: N-1 `Empresa`; 1-N `Manutencao` (como `funcionarioId`).
- Notas: 3 tipos (`ADMIN`, `GESTOR`, `TECNICO`).
  `ADMIN` tem `empresaId=null` (global) e sem especialidade. `GESTOR` exige
  empresa, sem especialidade. `TECNICO` exige empresa + especialidade
  (`MECANICO|ELETRICISTA`). Status `ATIVO|INATIVO` (inativo não loga).
