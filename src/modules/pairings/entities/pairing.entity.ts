export interface Pairing {
  id: string;
  macAddress: string;
  sensorId: string;
  secretHash: string;
  codeHash: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  deviceId: number | null;
}

export interface PairingApproval {
  pairing: Pairing;
  ativoId: number;
  setorId: number;
  empresaId: number;
  existingDeviceId: number | null;
  espId: string;
  tokenHash: string;
  descricao: string | null;
  now: Date;
}
