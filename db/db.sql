Drop DATABASE if EXISTS siva_db;
create DATABASE if not EXISTS siva_db;
use siva_db;

-- ============================================================
-- EMPRESA (cliente que adquiriu o sistema)
-- ============================================================
CREATE TABLE empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- USUARIO (você/super_admin, admins da empresa, funcionários)
-- ============================================================
CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('ADMIN', 'GESTOR', 'TECNICO') NOT NULL,
    especialidade ENUM('MECANICO', 'ELETRICISTA') NULL, -- obrigatória apenas para TECNICO
    status ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    empresa_id INT NULL,              -- NULL apenas para ADMIN
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

-- ============================================================
-- SETOR (produção, resfriamento, limpeza etc.)
-- ============================================================
CREATE TABLE setor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

-- ============================================================
-- ATIVO (equipamento monitorado: tanque, bomba, tubulação etc.)
-- ============================================================
CREATE TABLE ativo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setor_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,              -- ex: "Tanque de ETA 01"
    tag VARCHAR(50) UNIQUE,                  -- identificação física do ativo
    tipo VARCHAR(50),                        -- ex: "tanque", "bomba", "válvula"
    criticidade ENUM('baixa', 'media', 'alta') NOT NULL DEFAULT 'media',
    centro_custo VARCHAR(50),
    foto_url VARCHAR(255),
    manual_url VARCHAR(255),
    descricao VARCHAR(255),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (setor_id) REFERENCES setor(id)
);

-- ============================================================
-- ESP32 (central de comunicação/hardware)
-- ============================================================
CREATE TABLE esp32 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setor_id INT NOT NULL,
    esp_id VARCHAR(50) UNIQUE NOT NULL,      -- identificador usado no payload/firmware
    mac_address VARCHAR(17) UNIQUE NULL,
    pairing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    token_hash CHAR(64) UNIQUE NOT NULL,     -- SHA-256 do token (X-Token); nunca em texto plano
    descricao VARCHAR(100),
    ultimo_contato DATETIME NULL,            -- último payload recebido (online/offline)
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (setor_id) REFERENCES setor(id)
);

-- ============================================================
-- SENSOR (vinculado ao ativo que monitora e ao ESP32 que lê)
-- ============================================================
CREATE TABLE sensor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ativo_id INT NOT NULL,
    esp32_id INT NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,          -- identificador usado no payload (ex: "sensor_01")
    tag VARCHAR(50) UNIQUE,                  -- identificação física do sensor
    descricao VARCHAR(100),
    ativo_status BOOLEAN DEFAULT TRUE,       -- sensor ligado/desligado
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ativo_id) REFERENCES ativo(id),
    FOREIGN KEY (esp32_id) REFERENCES esp32(id),
    UNIQUE (esp32_id, sensor_id)
);

-- ============================================================
-- LEITURA (histórico de vazão)
-- ============================================================
CREATE TABLE leitura (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL,
    vazao FLOAT NOT NULL,                    -- L/min
    registrado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensor(id)
);

-- ============================================================
-- MANUTENCAO (chamados: preventiva, corretiva, inspeção)
-- ============================================================
CREATE TABLE manutencao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL,
    tipo ENUM('preventiva', 'corretiva', 'inspecao') NOT NULL,
    status ENUM('aberto', 'em_andamento', 'concluido') DEFAULT 'aberto',
    descricao TEXT,
    funcionario_id INT NULL,
    aberto_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    concluido_em DATETIME NULL,
    FOREIGN KEY (sensor_id) REFERENCES sensor(id),
    FOREIGN KEY (funcionario_id) REFERENCES usuario(id)
);

-- ============================================================
-- ÍNDICES (performance para consultas frequentes)
-- ============================================================
CREATE INDEX idx_leitura_sensor_data ON leitura (sensor_id, registrado_em);
CREATE INDEX idx_manutencao_status ON manutencao (status);
CREATE INDEX idx_ativo_criticidade ON ativo (criticidade);

INSERT INTO usuario (
    nome,
    email,
    senha,
    tipo,
    especialidade,
    status,
    empresa_id
) VALUES (
    'Administrador SIVA',
    'admin@siva.com',
    'Admin123', 'ADMIN',
    NULL,
    'ATIVO',
    NULL
);


CREATE TABLE `device_pairing` (
  `id` VARCHAR(36) NOT NULL,
  `mac_address` VARCHAR(17) NOT NULL,
  `sensor_id` VARCHAR(50) NOT NULL,
  `secret_hash` CHAR(64) NOT NULL,
  `code_hash` CHAR(64) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `device_id` INTEGER NULL,
  UNIQUE INDEX `device_pairing_mac_address_key` (`mac_address`),
  UNIQUE INDEX `device_pairing_code_hash_key` (`code_hash`),
  INDEX `device_pairing_expires_at_idx` (`expires_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `device_pairing_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `esp32`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
