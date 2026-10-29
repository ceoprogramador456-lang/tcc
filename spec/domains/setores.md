# Domínio: Setores

**Status: IMPLEMENTADO**

- Entidade/tabela: `Setor` → `setor` (`id`, `empresa_id`, `nome`, `criado_em`).
- Relações: N-1 `Empresa`; 1-N `Ativo`; 1-N `Esp32`.
- Notas: CRUD escrita super_admin+admin_empresa; leitura escopada por empresa
  (cadeia `getAccessible`). Sem regra adicional.
