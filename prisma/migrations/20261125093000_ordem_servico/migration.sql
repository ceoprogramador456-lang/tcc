-- CreateTable
CREATE TABLE `ordem_servico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `tipo` ENUM('preventiva', 'corretiva', 'inspecao') NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('aberto', 'em_andamento', 'concluido') NOT NULL DEFAULT 'aberto',
    `empresa_id` INTEGER NOT NULL,
    `solicitante_id` INTEGER NOT NULL,
    `funcionario_id` INTEGER NULL,
    `aceito_por` INTEGER NULL,
    `aceito_em` DATETIME(3) NULL,
    `concluido_em` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `ordem_servico` ADD CONSTRAINT `ordem_servico_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ordem_servico` ADD CONSTRAINT `ordem_servico_solicitante_id_fkey` FOREIGN KEY (`solicitante_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ordem_servico` ADD CONSTRAINT `ordem_servico_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ordem_servico` ADD CONSTRAINT `ordem_servico_aceito_por_fkey` FOREIGN KEY (`aceito_por`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `idx_ordem_servico_status` ON `ordem_servico`(`status`);
CREATE INDEX `idx_ordem_servico_empresa` ON `ordem_servico`(`empresa_id`);
