ALTER TABLE esp32
  ADD COLUMN mac CHAR(17) NULL,
  ADD COLUMN revoked_at DATETIME(3) NULL,
  ADD COLUMN model VARCHAR(64) NULL,
  ADD COLUMN firmware_version VARCHAR(32) NULL,
  ADD UNIQUE INDEX esp32_mac_key (mac);

CREATE TABLE device_pairing (
  id CHAR(36) NOT NULL,
  mac CHAR(17) NOT NULL,
  empresa_id INT NOT NULL,
  firmware_version VARCHAR(32) NOT NULL,
  model VARCHAR(64) NOT NULL,
  sensor_id VARCHAR(50) NOT NULL,
  secret_hash CHAR(64) NOT NULL,
  state VARCHAR(12) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE INDEX device_pairing_mac_key (mac),
  INDEX device_pairing_empresa_id_state_expires_at_idx (empresa_id, state, expires_at),
  CONSTRAINT device_pairing_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
