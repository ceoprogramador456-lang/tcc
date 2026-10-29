-- SIVA migration 001 — ADMIN/GESTOR/TECNICO + especialidade + status
-- Banco existente (ENUM antigo: super_admin/admin_empresa/funcionario) -> novo.
-- Executar uma única vez. Seguro para re-execução parcial (usa IF + information_schema).

-- 1) Mapeia valores antigos para novos (precisa de coluna temporária porque
--    ALTER ENUM com RENAME de valores não é atômico no MySQL).
ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS especialidade ENUM('MECANICO','ELETRICISTA') NULL AFTER tipo,
  ADD COLUMN IF NOT EXISTS status ENUM('ATIVO','INATIVO') NOT NULL DEFAULT 'ATIVO' AFTER especialidade;

-- Converte dados antigos (ignora se o ENUM antigo já foi substituído).
UPDATE usuario SET tipo = 'ADMIN'  WHERE tipo = 'super_admin';
UPDATE usuario SET tipo = 'GESTOR' WHERE tipo = 'admin_empresa';
UPDATE usuario SET tipo = 'TECNICO' WHERE tipo = 'funcionario';

-- Garante status padrão para registros legados.
UPDATE usuario SET status = 'ATIVO' WHERE status IS NULL OR status = '';

-- 2) Redefine o ENUM de tipo para os valores definitivos.
ALTER TABLE usuario MODIFY COLUMN tipo ENUM('ADMIN','GESTOR','TECNICO') NOT NULL;
