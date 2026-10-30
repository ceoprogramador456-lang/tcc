import type { Device } from '../../types/device';
import { httpClient } from '../api/http-client';

export interface PairingPreview {
  macAddress: string;
  sensorId: string;
  expiresAt: string;
  existingDeviceId: number | null;
}
export const pairingService = {
  lookup(token: string, code: string) {
    return httpClient.post<PairingPreview>('/device-pairings/lookup', { code }, { token });
  },
  approve(token: string, payload: { code: string; ativoId: number; descricao: string }) {
    return httpClient.post<{ device: Device }>('/device-pairings/approve', payload, { token });
  },
  reset(token: string, id: number) {
    return httpClient.post<void>(`/device-pairings/devices/${id}/reset`, {}, { token });
  },
};
