# Domínio: Empresas

**Status: IMPLEMENTADO**

- Entidade/tabela: `Empresa` → `empresa` (`id`, `nome`, `cnpj? unique`,
  `tipo`, `criado_em`).
- Relações: 1-N `Usuario`, 1-N `Setor`.
- `tipo` (`TipoEmpresa`): `SIVA` (dona do sistema) ou `CLIENTE` (empresa que
  adquiriu o sistema). Default `CLIENTE`.
- A SIVA é única e identificada pelo CNPJ reservado `00.000.000/0001-00`,
  garantido por migration/seed. Ela concentra os usuários `ADMIN` e `TECNICO`.
- CRUD:
  - leitura: `ADMIN` vê todas; `GESTOR` vê somente a própria; `TECNICO` não acessa;
  - escrita: somente `ADMIN`;
  - empresas criadas pela API nascem sempre `CLIENTE` (o `tipo` não é aceito no payload);
  - a SIVA não pode ser editada nem excluída (`409`).
