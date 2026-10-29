# Domínio: Sensores

**Status: IMPLEMENTADO**

- Entidade/tabela: `Sensor` → `sensor` (`id`, `ativo_id`, `esp32_id`,
  `sensor_id`, `tag? unique`, `descricao?`, `ativo_status` default true,
  `criado_em`; unique `[esp32Id, sensorId]`).
- Relações: N-1 `Ativo` + N-1 `Esp32`; 1-N `Leitura`; 1-N `Manutencao`.
- Notas: pertence ao cliente; funcionário faz inspeção/preventiva nele via
  `Manutencao` interna (ver `spec/business-rules/sensores-e-equipamentos.md`).
