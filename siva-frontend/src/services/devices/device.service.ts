import { httpClient } from '../api/http-client';
import type { PaginatedResult, QueryParams } from '../../types/api';
import type {
  ApproveDevicePayload,
  DeviceEvent,
  PendingDevice,
  Device,
  UpdateDevicePayload,
} from '../../types/device';

export interface ListDevicesParams {
  page?: number;
  pageSize?: number;
  setorId?: number | null;
  empresaId?: number | null;
}

const DEVICE_EVENTS: ReadonlySet<string> = new Set<DeviceEvent>([
  'device:discovered',
  'device:approved',
  'device:rejected',
  'device:revoked',
  'device:online',
  'device:offline',
]);

export const deviceService = {
  async watch(
    token: string,
    signal: AbortSignal,
    onConnect: () => void,
    onEvent: (event: DeviceEvent) => void,
  ): Promise<void> {
    const stream = await httpClient.openEventStream('/devices/events', token, signal);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      onConnect();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        const frames = (buffer + decoder.decode(value, { stream: true })).split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        if (buffer.length > 16_384) {
          await reader.cancel();
          return;
        }
        for (const frame of frames) {
          const field = frame.split(/\r?\n/).find((line) => line.startsWith('event:'));
          const event = field?.slice('event:'.length).trim();
          if (event && DEVICE_EVENTS.has(event)) onEvent(event as DeviceEvent);
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

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

  pending(token: string): Promise<PendingDevice[]> {
    return httpClient.get<PendingDevice[]>('/devices/pending', { token });
  },

  approve(token: string, id: string, payload: ApproveDevicePayload): Promise<void> {
    return httpClient.post(`/devices/pairing/${encodeURIComponent(id)}/approve`, payload, {
      token,
    });
  },

  reject(token: string, id: string): Promise<void> {
    return httpClient.post(`/devices/pairing/${encodeURIComponent(id)}/reject`, undefined, {
      token,
    });
  },

  revoke(token: string, id: number): Promise<void> {
    return httpClient.post(`/devices/${id}/revoke`, undefined, { token });
  },

  update(token: string, id: number, payload: UpdateDevicePayload): Promise<Device> {
    return httpClient.patch<Device>(`/devices/${id}`, payload, { token });
  },

  remove(token: string, id: number): Promise<void> {
    return httpClient.delete(`/devices/${id}`, { token });
  },
};
