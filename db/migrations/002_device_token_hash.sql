-- SIVA migration 002 — token do ESP32 passa a ser armazenado como hash (SHA-256)
--
-- Antes: `esp32.token` guardava o valor em texto plano (e era gerado com
-- Math.random()). O firmware continua usando o token em claro no header
-- `X-Token`; o back-end passa a comparar o hash.
--
-- Requer MySQL 8.0.29+ (suporta ADD/DROP COLUMN IF [NOT] EXISTS).
-- Seguro para re-execução parcial.

-- 1) Cria a coluna do hash (mantém a coluna antiga até a conversão terminar).
ALTER TABLE esp32
  ADD COLUMN IF NOT EXISTS token_hash CHAR(64) NULL AFTER esp_id;

-- 2) Converte os tokens existentes para hash.
UPDATE esp32
SET token_hash = SHA2(`token`, 256)
WHERE `token` IS NOT NULL AND (token_hash IS NULL OR token_hash = '');

-- 3) Índice único do hash (o índice unique do `token` sai junto com a coluna).
CREATE UNIQUE INDEX IF NOT EXISTS idx_esp32_token_hash ON esp32 (token_hash);

-- 4) Remove o token em texto plano.
ALTER TABLE esp32
  DROP COLUMN IF EXISTS `token`;

-- 5) Garante que não sobre linha sem hash (a coluna agora é NOT NULL).
--    Segurança: se algum registro ficou sem hash, a linha é removida porque
--    não teria como autenticar — a migração deve falhar alto, não silenciar.
--    (Verificar `SELECT COUNT(*) FROM esp32 WHERE token_hash IS NULL` antes.)
ALTER TABLE esp32
  MODIFY COLUMN token_hash CHAR(64) NOT NULL;
