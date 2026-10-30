ALTER TABLE `esp32`
  ADD COLUMN `mac_address` VARCHAR(17) NULL,
  ADD COLUMN `pairing_enabled` BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX `esp32_mac_address_key` ON `esp32`(`mac_address`);

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
