-- Perfil TECNICO passa a ser exclusivo da SIVA.
--
-- 1) Empresa ganha a natureza SIVA/CLIENTE.
-- 2) A empresa SIVA é garantida (CNPJ reservado).
-- 3) ADMIN e TECNICO existentes são vinculados à SIVA.
--    O histórico (OrdemServico.funcionarioId / Manutencao.funcionarioId)
--    é preservado porque apenas o empresa_id do usuário muda.

ALTER TABLE `empresa`
  ADD COLUMN `tipo` ENUM('SIVA', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE';

-- Reaproveita uma empresa que já use o CNPJ reservado da SIVA.
UPDATE `empresa`
SET `tipo` = 'SIVA'
WHERE `cnpj` = '00.000.000/0001-00';

SET @siva_id = (SELECT `id` FROM `empresa` WHERE `tipo` = 'SIVA' ORDER BY `id` LIMIT 1);

-- Reaproveita uma empresa já chamada SIVA, se existir.
UPDATE `empresa`
SET `tipo` = 'SIVA'
WHERE @siva_id IS NULL AND `nome` = 'SIVA'
ORDER BY `id`
LIMIT 1;

SET @siva_id = (SELECT `id` FROM `empresa` WHERE `tipo` = 'SIVA' ORDER BY `id` LIMIT 1);

-- Cria a SIVA somente se ainda não houver nenhuma.
INSERT INTO `empresa` (`nome`, `cnpj`, `tipo`)
SELECT 'SIVA', '00.000.000/0001-00', 'SIVA'
FROM DUAL
WHERE @siva_id IS NULL;

SET @siva_id = (SELECT `id` FROM `empresa` WHERE `tipo` = 'SIVA' ORDER BY `id` LIMIT 1);

-- ADMIN e TECNICO passam a pertencer à SIVA.
UPDATE `usuario`
SET `empresa_id` = @siva_id
WHERE `tipo` IN ('ADMIN', 'TECNICO')
  AND (`empresa_id` IS NULL OR `empresa_id` <> @siva_id);
