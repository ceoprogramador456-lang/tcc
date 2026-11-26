import type { Response } from 'express';
import { isAdmin } from '../../../shared/auth/scope.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { createUserRepository } from '../../users/repositories/user.repository.js';
import { DEVICE_ONLINE_WINDOW_MS, isDeviceOnline } from '../entities/device.entity.js';
import { createDeviceRepository } from '../repositories/device.repository.js';

type DeviceEvent =
  | 'device:discovered'
  | 'device:approved'
  | 'device:rejected'
  | 'device:revoked'
  | 'device:online'
  | 'device:offline';

interface Listener {
  userId: number;
  notify: (empresaId: number, event: DeviceEvent) => void;
  close: () => void;
}

const users = createUserRepository();
const devices = createDeviceRepository();
const listeners = new Set<Listener>();
const presenceTimers = new Map<number, NodeJS.Timeout>();

export function publishDeviceEvent(empresaId: number, event: DeviceEvent) {
  for (const listener of listeners) listener.notify(empresaId, event);
}

function clearPresenceTimer(id: number) {
  clearTimeout(presenceTimers.get(id));
  presenceTimers.delete(id);
}

function scheduleOffline(id: number, setorId: number, empresaId: number, lastContact: Date) {
  clearPresenceTimer(id);
  const remaining = Math.max(1, lastContact.getTime() + DEVICE_ONLINE_WINDOW_MS - Date.now() + 1);
  const timer = setTimeout(async () => {
    try {
      const device = await devices.findById(id);
      if (presenceTimers.get(id) !== timer) return;
      if (device?.setorId === setorId && !device.revokedAt && device.ultimoContato) {
        if (isDeviceOnline(device)) {
          scheduleOffline(id, setorId, empresaId, new Date(device.ultimoContato));
        } else {
          publishDeviceEvent(empresaId, 'device:offline');
        }
      }
    } catch {
      // A listagem periódica atualiza o estado se o banco estiver indisponível.
    } finally {
      if (presenceTimers.get(id) === timer) presenceTimers.delete(id);
    }
  }, remaining);
  presenceTimers.set(id, timer.unref());
}

export function recordDeviceContact(
  id: number,
  setorId: number,
  empresaId: number,
  lastContact: Date,
  wasOnline: boolean,
) {
  if (!wasOnline && !presenceTimers.has(id)) publishDeviceEvent(empresaId, 'device:online');
  scheduleOffline(id, setorId, empresaId, lastContact);
}

export function markDeviceOffline(id: number, empresaId: number, wasOnline: boolean) {
  clearPresenceTimer(id);
  if (wasOnline) publishDeviceEvent(empresaId, 'device:offline');
}

export function closeDeviceEventStreams() {
  for (const listener of listeners) listener.close();
  for (const id of presenceTimers.keys()) clearPresenceTimer(id);
}

export function streamDeviceEvents(user: AuthenticatedUser, expiresAt: number, res: Response) {
  const activeForUser = [...listeners].filter((listener) => listener.userId === user.id).length;
  if (listeners.size >= 128 || activeForUser >= 4) {
    throw new AppError('Limite de conexões de atualização atingido.', 429, 'DEVICE_EVENTS_LIMIT');
  }

  const pending = new Set<DeviceEvent>();
  let flushing = false;
  const listener: Listener = {
    userId: user.id,
    notify(empresaId, event) {
      if (!isAdmin(user) && user.empresaId !== empresaId) return;
      if (user.tipo === 'TECNICO' && event !== 'device:online' && event !== 'device:offline')
        return;
      pending.add(event);
      void flush();
    },
    close() {
      cleanup();
      res.end();
    },
  };

  function cleanup() {
    clearInterval(heartbeat);
    clearTimeout(expiration);
    listeners.delete(listener);
    pending.clear();
  }

  function write(frame: string) {
    if (res.write(frame)) return true;
    cleanup();
    res.destroy();
    return false;
  }

  async function flush(keepAlive = false) {
    if (flushing) return;
    flushing = true;
    try {
      const current = await users.findById(user.id);
      if (!listeners.has(listener)) return;
      if (
        Date.now() >= expiresAt ||
        current?.status !== 'ATIVO' ||
        current.tipo !== user.tipo ||
        current.empresaId !== user.empresaId
      ) {
        listener.close();
        return;
      }

      for (const event of pending) {
        if (!write(`event: ${event}\ndata: {}\n\n`)) return;
      }
      pending.clear();
      if (keepAlive) write(': keepalive\n\n');
    } catch {
      listener.close();
    } finally {
      flushing = false;
    }
  }

  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    'X-Accel-Buffering': 'no',
  });
  const heartbeat = setInterval(() => void flush(true), 20_000).unref();
  const expiration = setTimeout(listener.close, Math.max(1, expiresAt - Date.now())).unref();
  res.on('close', cleanup);
  listeners.add(listener);
  res.flushHeaders();
  write(': connected\n\n');
}
