# Regra: Usuários e permissões (definição oficial)

Base: `docs/analise-regras-negocio.md` §§1,3. `tipo/perfil` = autorização;
`cargo` = função operacional (nunca criar mecânico/eletricista como tipo).

## Existente (3 tipos)

- `super_admin` (`empresaId=null`): global; único CRUD empresas, único
  `DELETE /users/:id`.
- `admin_empresa`: própria empresa; CRUD setor/ativo/device/sensor + users
  (exceto deletar). Alias futuro `gestor` NECESSITA DEFINIÇÃO.
- `funcionario`: leitura escopada + manutenções (único módulo sem `authorize` = gap).

## Planejado

- `operador` (vendedora): atendimento técnico; nunca gerir preventiva/inspeção
  interna; `authorize('operador')` só em chamados/OS.
- `Usuario.cargo?` (ex: mecanico, eletricista): campo opcional, sem efeito em
  `authorize`.
