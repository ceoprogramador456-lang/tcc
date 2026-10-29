# Domínio: ESP32

**Status: IMPLEMENTADO**

- Entidade/tabela: `Esp32` → `esp32` (`id`, `setor_id`, `esp_id unique`,
  `token unique`, `descricao?`, `ultimo_contato?`, `criado_em`).
- Relações: N-1 `Setor`; 1-N `Sensor`.
- Notas: dispositivo da **vendedora** instalado no cliente; autentica ingestão
  via `X-Token`. Problemas nele seguem via Chamado→OS (PLANEJADO), não via
  `Manutencao`. Ver `spec/business-rules/sensores-e-equipamentos.md`.
