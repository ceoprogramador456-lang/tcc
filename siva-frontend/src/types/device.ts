export interface Device {
  id: number;
  setorId: number;
  espId: string;
  mac?: string | null;
  revokedAt?: string | null;
  descricao: string | null;
  ultimoContato: string | null;
  criadoEm: string;
  online: boolean;
}

export interface PendingDevice {
  id: string;
  mac: string;
  model: string;
  firmwareVersion: string;
  sensorId: string;
  expiresAt: string;
  empresaId: number;
  setorId?: number | null;
  ativoId?: number | null;
}

export type ApproveDevicePayload = {
  code: string;
  setorId: number;
  descricao?: string;
} & ({ ativoId: number; novoAtivo?: never } | { novoAtivo: { nome: string }; ativoId?: never });

export type DeviceEvent =
  | 'device:discovered'
  | 'device:approved'
  | 'device:rejected'
  | 'device:revoked'
  | 'device:online'
  | 'device:offline';

export interface UpdateDevicePayload {
  setorId?: number;
  espId?: string;
  descricao?: string | null;
}
