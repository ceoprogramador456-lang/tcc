# Domínio: Empresas

**Status: IMPLEMENTADO**

- Entidade/tabela: `Empresa` → `empresa` (`id`, `nome`, `cnpj? unique`, `criado_em`).
- Relações: 1-N `Usuario`, 1-N `Setor`.
- Notas: CRUD escrita só `super_admin`; leitura escopada (`company.service`
  filtra `id = empresaId ?? -1` p/ não-super). Sem `Empresa.tipo
  (vendedora|cliente)` — PLANEJADO (ver `spec/business-rules/multi-empresa.md`).
