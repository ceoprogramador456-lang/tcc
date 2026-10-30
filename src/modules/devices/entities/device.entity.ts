export interface Device {
  id: number;
  setorId: number;
  espId: string;
  macAddress: string | null;
  pairingEnabled: boolean;
  /** SHA-256 do token de acesso — o token em claro nunca é persistido. */
  tokenHash: string;
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

/** Resposta de criação: o token em claro é entregue uma única vez. */
export interface CreatedDevice extends PublicDevice {
  token: string;
}

export function isDeviceOnline(
  device: Pick<Device, 'ultimoContato'>,
  now: Date = new Date(),
): boolean {
  if (!device.ultimoContato) return false;
  return now.getTime() - new Date(device.ultimoContato).getTime() <= DEVICE_ONLINE_WINDOW_MS;
}

/**
 * Remove o hash do token da representação pública.
 *
 * O hash também é sensível: com ele, um vazamento do banco permitiria forjar
 * um header `X-Token` válido. Ele nunca sai do back-end.
 */
export function toPublicDevice(device: Device): PublicDevice {
  const { tokenHash: _tokenHash, ...publicDevice } = device;
  return { ...publicDevice, online: isDeviceOnline(device) };
}
