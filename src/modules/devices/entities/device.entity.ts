export interface Device {
  id: number;
  setorId: number;
  espId: string;
  /** SHA-256 do token de acesso — o token em claro nunca é persistido. */
  tokenHash: string;
  mac?: string | null;
  revokedAt?: Date | null;
  model?: string | null;
  firmwareVersion?: string | null;
  descricao: string | null;
  ultimoContato: Date | null;
  criadoEm: Date;
}

/**
 * Janela de comunicação: o dispositivo é considerado online quando recebeu
 * alguma leitura nos últimos 10 minutos. `ultimoContato` é atualizado a cada
 * ingestão aceita (ver `readingService.ingest`).
 */
export const DEVICE_ONLINE_WINDOW_MS = 10 * 60 * 1000;

export type PublicDevice = Omit<Device, 'tokenHash'> & { online: boolean };

export function isDeviceOnline(
  device: Pick<Device, 'ultimoContato' | 'revokedAt'>,
  now: Date = new Date(),
): boolean {
  if (device.revokedAt || !device.ultimoContato) return false;
  return now.getTime() - new Date(device.ultimoContato).getTime() <= DEVICE_ONLINE_WINDOW_MS;
}

export function toPublicDevice(device: Device): PublicDevice {
  const { tokenHash: _tokenHash, ...publicDevice } = device;
  return {
    mac: null,
    model: null,
    firmwareVersion: null,
    revokedAt: null,
    ...publicDevice,
    online: isDeviceOnline(device),
  };
}
