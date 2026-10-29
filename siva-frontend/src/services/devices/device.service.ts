import { httpClient } from '../api/http-client';
import type { PaginatedResult, QueryParams } from '../../types/api';
import type {
  CreateDevicePayload,
  CreatedDevice,
  Device,
  UpdateDevicePayload,
} from '../../types/device';

export interface ListDevicesParams {
  page?: number;
  pageSize?: number;
  setorId?: number | null;
  empresaId?: number | null;
}

/**
 * Operações de dispositivo ESP32.
 *
 * Contrato confirmado no back-end (`src/modules/devices`):
 *  - `GET    /api/devices?empresaId=&setorId=` → já escopado pela empresa do ator;
 *  - `GET    /api/devices/:id` → dispositivo (sem token);
 *  - `POST   /api/devices`     → cria (ADMIN, GESTOR) e devolve o **token uma única vez**;
 *  - `PATCH  /api/devices/:id` → edita (ADMIN, GESTOR) — o token não é alterado;
 *  - `DELETE /api/devices/:id` → remove (ADMIN, GESTOR).
 */
export const deviceService = {
  list(token: string, params: ListDevicesParams = {}): Promise<PaginatedResult<Device>> {
    const query: QueryParams = {
      page: params.page,
      pageSize: params.pageSize,
      setorId: params.setorId ?? undefined,
      empresaId: params.empresaId ?? undefined,
    };
    return httpClient.getPaginated<Device>('/devices', { token, query });
  },

  getById(token: string, id: number): Promise<Device> {
    return httpClient.get<Device>(`/devices/${id}`, { token });
  },

  create(token: string, payload: CreateDevicePayload): Promise<CreatedDevice> {
    return httpClient.post<CreatedDevice>('/devices', payload, { token });
  },

  update(token: string, id: number, payload: UpdateDevicePayload): Promise<Device> {
    return httpClient.patch<Device>(`/devices/${id}`, payload, { token });
  },

  remove(token: string, id: number): Promise<void> {
    return httpClient.delete(`/devices/${id}`, { token });
  },
};
