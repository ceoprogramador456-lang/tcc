import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import request from 'supertest';
import { expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { DEVICE_ONLINE_WINDOW_MS } from '../src/modules/devices/entities/device.entity.js';
import {
  publishDeviceEvent,
  recordDeviceContact,
} from '../src/modules/devices/services/device-events.service.js';
import { devices } from '../src/shared/mock/mock-store.js';

const base = '/api/devices';

async function connect(url: string, authorization: string, signal: AbortSignal) {
  const response = await fetch(url + base + '/events', {
    signal,
    headers: { Authorization: authorization, 'Accept-Encoding': 'gzip' },
  });
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  expect(response.headers.get('content-encoding')).toBeNull();
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  return async () => {
    while (!buffer.includes('\n\n')) {
      const { done, value } = await reader.read();
      if (done) throw new Error('Conexão SSE encerrada antes do evento.');
      buffer += value;
    }
    const next = buffer.indexOf('\n\n');
    const frame = buffer.slice(0, next);
    buffer = buffer.slice(next + 2);
    return frame;
  };
}

it('transmite mudanças sem segredos e respeita empresa e cargo do assinante', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  const abort = new AbortController();
  try {
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Endereço HTTP inválido.');
    const url = `http://127.0.0.1:${address.port}`;
    const api = request(server);
    const login = async (email: string) => {
      const response = await api
        .post('/api/auth/login')
        .send({ email, senha: 'senha123' })
        .expect(200);
      return `Bearer ${response.body.data.token}`;
    };
    await api.get(base + '/events').expect(401);
    const [gestor, outraEmpresa, tecnico] = await Promise.all([
      login('carla.mendes@aquaplas.com'),
      login('beatriz.nogueira@metaltec.com'),
      login('diego.ramos@siva.com'),
    ]);
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(6000)]);
    await api.get(base + '/events').set('Authorization', tecnico).expect(403);
    const [same, other] = await Promise.all([
      connect(url, gestor, signal),
      connect(url, outraEmpresa, signal),
    ]);
    for (const next of [same, other]) expect(await next()).toBe(': connected');

    const secret = randomBytes(32).toString('hex');
    const discovery = await api
      .post(base + '/discovery')
      .set('X-Pairing-Secret', secret)
      .send({ mac: '02:00:00:00:00:66', firmwareVersion: '1.0', model: 'ESP32', sensorId: 'fluxo' })
      .expect(200);
    const { sessionId, code } = discovery.body.data;
    expect(await same()).toBe('event: device:discovered\ndata: {}');
    // Um evento autorizado serve de marcador no stream da outra empresa.
    publishDeviceEvent(2, 'device:rejected');
    expect(await other()).toBe('event: device:rejected\ndata: {}');

    const approval = await api
      .post(base + '/pairing/' + sessionId + '/approve')
      .set('Authorization', gestor)
      .send({ code, setorId: 1, ativoId: 1 })
      .expect(200);
    expect(await same()).toBe('event: device:approved\ndata: {}');

    const pickup = await api
      .post(base + '/credentials')
      .set('X-Pairing-Secret', secret)
      .send({ sessionId })
      .expect(200);
    const { token, espId } = pickup.body.data;
    const sendReading = () =>
      api
        .post('/api/readings')
        .set('X-Token', token)
        .send({ esp_id: espId, sensor_id: 'fluxo', vazao: 2 })
        .expect(201);
    await sendReading();
    expect(await same()).toBe('event: device:online\ndata: {}');

    const deviceId: number = approval.body.data.id;
    const contact = new Date(Date.now() - DEVICE_ONLINE_WINDOW_MS + 30);
    devices.update(deviceId, { ultimoContato: contact });
    recordDeviceContact(deviceId, 1, 1, contact, true);
    expect(await same()).toBe('event: device:offline\ndata: {}');
    await sendReading();
    expect(await same()).toBe('event: device:online\ndata: {}');

    await api
      .post(base + '/' + deviceId + '/revoke')
      .set('Authorization', gestor)
      .expect(204);
    expect(await same()).toBe('event: device:revoked\ndata: {}');
    expect(await same()).toBe('event: device:offline\ndata: {}');
    publishDeviceEvent(2, 'device:approved');
    expect(await other()).toBe('event: device:approved\ndata: {}');
  } finally {
    abort.abort();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 8000);
