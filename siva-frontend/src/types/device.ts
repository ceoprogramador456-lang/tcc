/**
 * Contratos de dispositivo ESP32.
 *
 * Espelha `Device` / `PublicDevice` / `CreatedDevice` do backend
 * (ver `src/modules/devices/entities/device.entity.ts`).
 *
 * O `tokenHash` nunca é exposto pela API. O token em claro aparece **apenas**
 * na resposta de criação.
 */

export interface Device {
  id: number;
  setorId: number;
  espId: string;
  descricao: string | null;
  ultimoContato: string | null;
  criadoEm: string;
  /** Calculado pelo back-end a partir do último contato. */
  online: boolean;
}

export interface CreatedDevice extends Device {
  /** Token de autenticação do firmware — exibido uma única vez. */
  token: string;
}

export interface CreateDevicePayload {
  setorId: number;
  espId: string;
  descricao?: string | null;
}

export interface UpdateDevicePayload {
  setorId?: number;
  espId?: string;
  descricao?: string | null;
}
