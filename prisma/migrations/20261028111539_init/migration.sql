-- CreateTable
CREATE TABLE `empresa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `cnpj` VARCHAR(20) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `empresa_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `senha` VARCHAR(255) NOT NULL,
    `tipo` ENUM('ADMIN', 'GESTOR', 'TECNICO') NOT NULL,
    `especialidade` ENUM('MECANICO', 'ELETRICISTA') NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `empresa_id` INTEGER NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ativo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setor_id` INTEGER NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `tag` VARCHAR(50) NULL,
    `tipo` VARCHAR(50) NULL,
    `criticidade` ENUM('baixa', 'media', 'alta') NOT NULL DEFAULT 'media',
    `centro_custo` VARCHAR(50) NULL,
    `foto_url` VARCHAR(255) NULL,
    `manual_url` VARCHAR(255) NULL,
    `descricao` VARCHAR(255) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ativo_tag_key`(`tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `esp32` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setor_id` INTEGER NOT NULL,
    `esp_id` VARCHAR(50) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `descricao` VARCHAR(100) NULL,
    `ultimo_contato` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `esp32_esp_id_key`(`esp_id`),
    UNIQUE INDEX `esp32_token_hash_key`(`token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sensor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ativo_id` INTEGER NOT NULL,
    `esp32_id` INTEGER NOT NULL,
    `sensor_id` VARCHAR(50) NOT NULL,
    `tag` VARCHAR(50) NULL,
    `descricao` VARCHAR(100) NULL,
    `ativo_status` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sensor_tag_key`(`tag`),
    UNIQUE INDEX `sensor_esp32_id_sensor_id_key`(`esp32_id`, `sensor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leitura` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sensor_id` INTEGER NOT NULL,
    `vazao` DOUBLE NOT NULL,
    `registrado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_leitura_sensor_data`(`sensor_id`, `registrado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manutencao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sensor_id` INTEGER NOT NULL,
    `tipo` ENUM('preventiva', 'corretiva', 'inspecao') NOT NULL,
    `status` ENUM('aberto', 'em_andamento', 'concluido') NOT NULL DEFAULT 'aberto',
    `descricao` TEXT NULL,
    `funcionario_id` INTEGER NULL,
    `aberto_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `concluido_em` DATETIME(3) NULL,

    INDEX `idx_manutencao_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `setor` ADD CONSTRAINT `setor_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ativo` ADD CONSTRAINT `ativo_setor_id_fkey` FOREIGN KEY (`setor_id`) REFERENCES `setor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `esp32` ADD CONSTRAINT `esp32_setor_id_fkey` FOREIGN KEY (`setor_id`) REFERENCES `setor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sensor` ADD CONSTRAINT `sensor_ativo_id_fkey` FOREIGN KEY (`ativo_id`) REFERENCES `ativo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sensor` ADD CONSTRAINT `sensor_esp32_id_fkey` FOREIGN KEY (`esp32_id`) REFERENCES `esp32`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leitura` ADD CONSTRAINT `leitura_sensor_id_fkey` FOREIGN KEY (`sensor_id`) REFERENCES `sensor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manutencao` ADD CONSTRAINT `manutencao_sensor_id_fkey` FOREIGN KEY (`sensor_id`) REFERENCES `sensor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manutencao` ADD CONSTRAINT `manutencao_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
