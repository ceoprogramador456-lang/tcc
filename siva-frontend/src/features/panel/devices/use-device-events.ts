import { useEffect } from 'react';

import { ApiError } from '../../../services/api/http-client';
import { deviceService } from '../../../services/devices/device.service';
import type { DeviceEvent } from '../../../types/device';

export function useDeviceEvents(
  token: string,
  refreshDevices: () => void,
  refreshPending: () => void,
): void {
  useEffect(() => {
    const controller = new AbortController();
    let retryDelay = 1_000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let pendingChanged = false;
    let devicesChanged = false;

    function invalidate(event?: DeviceEvent) {
      if (controller.signal.aborted) return;
      pendingChanged ||= event !== 'device:online' && event !== 'device:offline';
      devicesChanged ||= event !== 'device:discovered' && event !== 'device:rejected';
      refreshTimer ??= setTimeout(() => {
        refreshTimer = undefined;
        if (pendingChanged) refreshPending();
        if (devicesChanged) refreshDevices();
        pendingChanged = false;
        devicesChanged = false;
      }, 200);
    }

    async function subscribe() {
      let connectedAt: number | undefined;
      try {
        await deviceService.watch(
          token,
          controller.signal,
          () => {
            connectedAt = Date.now();
            invalidate();
          },
          invalidate,
        );
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return;
      }
      if (controller.signal.aborted) return;
      if (connectedAt !== undefined && Date.now() - connectedAt >= 10_000) retryDelay = 1_000;
      retryTimer = setTimeout(() => void subscribe(), retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    }

    void subscribe();
    return () => {
      controller.abort();
      clearTimeout(retryTimer);
      clearTimeout(refreshTimer);
    };
  }, [token, refreshDevices, refreshPending]);
}
