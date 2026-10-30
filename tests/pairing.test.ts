import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pairingRepository } from '../src/modules/pairings/repositories/pairing.repository.js';
import { createDeviceRepository } from '../src/modules/devices/repositories/device.repository.js';

const identity = () => ({
  macAddress: `02:${randomBytes(5).toString('hex').match(/../g)!.join(':')}`.toUpperCase(),
  sensorId: 'flow_01',
});
async function login(app: ReturnType<typeof createApp>, email = 'super@siva.com') {
  const response = await request(app).post('/api/auth/login').send({ email, senha: 'senha123' });
  expect(response.status).toBe(200);
  return response.body.data.token as string;
}
async function start(app: ReturnType<typeof createApp>) {
  const body = identity();
  const secret = randomBytes(32).toString('hex');
  const res = await request(app)
    .post('/api/device-pairings/request')
    .set('X-Pairing-Key', secret)
    .send(body);
  expect(res.status).toBe(201);
  return { body, secret, code: res.body.data.code as string };
}
afterEach(() => vi.useRealTimers());

describe('pareamento ESP32 → aprovação → leituras', () => {
  it('cria dispositivo e sensor, entrega somente à placa, confirma e mantém o token após reinício da API', async () => {
    let app = createApp();
    const jwt = await login(app);
    const { body, secret, code } = await start(app);
    const pending = await request(app)
      .post('/api/device-pairings/status')
      .set('X-Pairing-Key', secret)
      .send({ macAddress: body.macAddress });
    expect(pending.body.data).toEqual({ status: 'PENDING' });
    const preview = await request(app)
      .post('/api/device-pairings/lookup')
      .auth(jwt, { type: 'bearer' })
      .send({ code });
    expect(preview.body.data.macAddress).toBe(body.macAddress);
    expect(preview.body.data.token).toBeUndefined();
    const approval = await request(app)
      .post('/api/device-pairings/approve')
      .auth(jwt, { type: 'bearer' })
      .send({ code, ativoId: 1 });
    expect(approval.status).toBe(201);
    expect(approval.body.data.device.token).toBeUndefined();
    expect(approval.body.data.device.tokenHash).toBeUndefined();
    expect(approval.body.data.sensor.ativoId).toBe(1);
    const poll = () =>
      request(app)
        .post('/api/device-pairings/status')
        .set('X-Pairing-Key', secret)
        .send({ macAddress: body.macAddress });
    const credentials = (await poll()).body.data;
    expect(credentials.token).toMatch(/^dev-/);
    expect((await poll()).body.data.token).toBe(credentials.token); // dropped response is recoverable
    expect(
      (
        await request(app)
          .post('/api/device-pairings/acknowledge')
          .set('X-Pairing-Key', secret)
          .send({ macAddress: body.macAddress })
      ).status,
    ).toBe(204);
    expect((await poll()).body.data).toEqual({ status: 'DELIVERED' });
    app = createApp();
    const reading = await request(app)
      .post('/api/readings')
      .set('X-Token', credentials.token)
      .send({ esp_id: credentials.espId, sensor_id: credentials.sensorId, vazao: 3.5 });
    expect(reading.status).toBe(201);
    const saved = await request(app)
      .get(`/api/readings?sensorId=${approval.body.data.sensor.id}`)
      .auth(jwt, { type: 'bearer' });
    expect(saved.body.data.some((item: { vazao: number }) => item.vazao === 3.5)).toBe(true);
    const device = await request(app)
      .get(`/api/devices/${approval.body.data.device.id}`)
      .auth(jwt, { type: 'bearer' });
    expect(device.body.data.online).toBe(true);
  });

  it('não permite autenticar a placa apenas pelo MAC ou usar outra chave temporária', async () => {
    const app = createApp();
    const { body } = await start(app);
    for (const key of ['', randomBytes(32).toString('hex')]) {
      const response = await request(app)
        .post('/api/device-pairings/status')
        .set('X-Pairing-Key', key)
        .send({ macAddress: body.macAddress });
      expect(response.status).toBe(401);
    }
  });
  it('mantém o código ao repetir a solicitação após perda de resposta e bloqueia sequestro da sessão', async () => {
    const app = createApp();
    const { body, secret, code } = await start(app);
    const repeat = await request(app)
      .post('/api/device-pairings/request')
      .set('X-Pairing-Key', secret)
      .send(body);
    expect(repeat.body.data.code).toBe(code);
    expect(
      (
        await request(app)
          .post('/api/device-pairings/request')
          .set('X-Pairing-Key', randomBytes(32).toString('hex'))
          .send(body)
      ).status,
    ).toBe(409);
  });
  it('exige usuário autenticado e bloqueia TECNICO na aprovação', async () => {
    const app = createApp();
    const { code } = await start(app);
    expect(
      (await request(app).post('/api/device-pairings/approve').send({ code, ativoId: 1 })).status,
    ).toBe(401);
    const token = await login(app, 'diego.ramos@aquaplas.com');
    expect(
      (
        await request(app)
          .post('/api/device-pairings/approve')
          .auth(token, { type: 'bearer' })
          .send({ code, ativoId: 1 })
      ).status,
    ).toBe(403);
  });
  it('GESTOR não vincula a um equipamento de outra empresa; o código continua utilizável na própria empresa', async () => {
    const app = createApp();
    const { code } = await start(app);
    const token = await login(app, 'carla.mendes@aquaplas.com');
    expect(
      (
        await request(app)
          .post('/api/device-pairings/approve')
          .auth(token, { type: 'bearer' })
          .send({ code, ativoId: 3 })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/device-pairings/approve')
          .auth(token, { type: 'bearer' })
          .send({ code, ativoId: 1 })
      ).status,
    ).toBe(201);
  });
  it('aceita apenas uma aprovação concorrente', async () => {
    const app = createApp();
    const jwt = await login(app);
    const { code } = await start(app);
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post('/api/device-pairings/approve')
          .auth(jwt, { type: 'bearer' })
          .send({ code, ativoId: 1 }),
      ),
    );
    expect(responses.filter((res) => res.status === 201)).toHaveLength(1);
    expect(responses.filter((res) => [404, 409].includes(res.status))).toHaveLength(1);
  });
  it('expira o código e permite nova solicitação após 10 minutos', async () => {
    const app = createApp();
    const jwt = await login(app);
    const { body, secret, code } = await start(app);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(Date.now() + 601_000));
    expect(
      (
        await request(app)
          .post('/api/device-pairings/approve')
          .auth(jwt, { type: 'bearer' })
          .send({ code, ativoId: 1 })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post('/api/device-pairings/status')
          .set('X-Pairing-Key', secret)
          .send({ macAddress: body.macAddress })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post('/api/device-pairings/request')
          .set('X-Pairing-Key', randomBytes(32).toString('hex'))
          .send(body)
      ).status,
    ).toBe(201);
  });
  it('renova o pareamento sem perder dispositivo/sensor/histórico e revoga a credencial antiga', async () => {
    const app = createApp();
    const jwt = await login(app);
    const { body, secret, code } = await start(app);
    const approval = await request(app)
      .post('/api/device-pairings/approve')
      .auth(jwt, { type: 'bearer' })
      .send({ code, ativoId: 1 });
    const id = approval.body.data.device.id;
    const poll = await request(app)
      .post('/api/device-pairings/status')
      .set('X-Pairing-Key', secret)
      .send({ macAddress: body.macAddress });
    const credentials = poll.body.data;
    const send = () =>
      request(app)
        .post('/api/readings')
        .set('X-Token', credentials.token)
        .send({ esp_id: credentials.espId, sensor_id: 'flow_01', vazao: 7 });
    expect((await send()).status).toBe(201);
    expect(
      (await request(app).delete(`/api/devices/${id}`).auth(jwt, { type: 'bearer' })).status,
    ).toBe(409);
    const technician = await login(app, 'diego.ramos@aquaplas.com');
    expect(
      (
        await request(app)
          .post(`/api/device-pairings/devices/${id}/reset`)
          .auth(technician, { type: 'bearer' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/device-pairings/devices/${id}/reset`)
          .auth(jwt, { type: 'bearer' })
      ).status,
    ).toBe(204);
    expect((await send()).status).toBe(401);
    const newSecret = randomBytes(32).toString('hex');
    const second = await request(app)
      .post('/api/device-pairings/request')
      .set('X-Pairing-Key', newSecret)
      .send(body);
    const paired = await request(app)
      .post('/api/device-pairings/approve')
      .auth(jwt, { type: 'bearer' })
      .send({ code: second.body.data.code, ativoId: 1 });
    expect(paired.status).toBe(201);
    expect(paired.body.data.device.id).toBe(id);
    expect(paired.body.data.sensor.id).toBe(approval.body.data.sensor.id);
    const saved = await request(app)
      .get(`/api/readings?sensorId=${paired.body.data.sensor.id}`)
      .auth(jwt, { type: 'bearer' });
    expect(saved.body.data).toHaveLength(1);
    const row = await pairingRepository.findByMac(body.macAddress);
    expect(row!.secretHash).not.toBe(newSecret);
    expect(row!.codeHash).not.toBe(second.body.data.code);
  });
  it('mantém cadastros legados e permite um segundo identificador diferente', async () => {
    const app = createApp();
    const jwt = await login(app);
    for (const espId of ['legacy_one', 'legacy_two'])
      expect(
        (
          await request(app)
            .post('/api/devices')
            .auth(jwt, { type: 'bearer' })
            .send({ setorId: 1, espId })
        ).status,
      ).toBe(201);
    expect(
      (await createDeviceRepository().list({ filter: { espId: 'legacy_two' } })).items,
    ).toHaveLength(1);
  });
  it('limita tentativas de adivinhar códigos', async () => {
    const app = createApp();
    const jwt = await login(app);
    for (let i = 0; i < 10; i++)
      expect(
        (
          await request(app)
            .post('/api/device-pairings/lookup')
            .auth(jwt, { type: 'bearer' })
            .send({ code: 'FFFFFFFF' })
        ).status,
      ).toBe(404);
    expect(
      (
        await request(app)
          .post('/api/device-pairings/lookup')
          .auth(jwt, { type: 'bearer' })
          .send({ code: 'FFFFFFFF' })
      ).status,
    ).toBe(429);
  });
});
