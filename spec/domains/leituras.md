# Domínio: Leituras

**Status: IMPLEMENTADO**

- Entidade/tabela: `Leitura` → `leitura` (`id` BigInt, `sensor_id`, `vazao`,
  `registrado_em`; índice `[sensorId, registradoEm]`).
- Relações: N-1 `Sensor`.
- Notas: imutável (create + list, sem update/delete); `POST` autenticado por
  `X-Token` do ESP32 dono + valida `esp_id`; `GET` por JWT escopado.
  Payload: `{esp_id, setor, sensor_id, vazao}`.
