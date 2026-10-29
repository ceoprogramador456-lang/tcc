# Arquitetura: banco de dados

- **Estado atual**: MySQL via Prisma; **8 tabelas**, sem Chamado/OS:
  `empresa → usuario/setor; setor → ativo/esp32; sensor (ativo+esp32) →
  leitura/manutencao; usuario → manutencao`. Uniques (`cnpj`, `email`,
  `esp_id`, `token`, tags, `[esp32Id,sensorId]`) + índices
  (`idx_leitura_sensor_data`, `idx_manutencao_status`). `schema.prisma` espelha
  `db/db.sql`. Sem `onDelete/updatedAt`, sem migrations iniciais.
  Detalhe: `docs/DATABASE.md`.
- **Estado planejado**: `Chamado`, `OrdemServico (+historico)`,
  `Empresa.tipo`, `Usuario.cargo`, vínculo operador×clientes (se atribuído);
  `updatedAt/onDelete`/índices; unificar `db.sql`×Prisma. NÃO adicionar
  `Manutencao.alvo` obrigatório.
