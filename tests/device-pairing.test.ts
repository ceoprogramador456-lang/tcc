import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createDeviceRepository } from '../src/modules/devices/repositories/device.repository.js';
import { hashDeviceToken } from '../src/utils/device-token.js';

const app = createApp();
const base = '/api/devices';
let gestor: string;
let outraEmpresa: string;
let tecnico: string;

async function login(email: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, senha: 'senha123' })
    .expect(200);
  return 'Bearer ' + res.body.data.token;
}

function placa(mac: string) {
  const secret = randomBytes(32).toString('hex');
  const info = { mac, firmwareVersion: '1.0', model: 'ESP32', sensorId: 'fluxo' };
  return {
    secret,
    descobrir: () =>
      request(app)
        .post(base + '/discovery')
        .set('X-Pairing-Secret', secret)
        .send(info),
    consultar: (id: string) =>
      request(app)
        .post(base + '/pairing/status')
        .set('X-Pairing-Secret', secret)
        .send({ sessionId: id }),
    retirar: (id: string) =>
      request(app)
        .post(base + '/credentials')
        .set('X-Pairing-Secret', secret)
        .send({ sessionId: id }),
  };
}

function aprovar(id: string, code: string, auth = gestor, setorId = 1, ativoId = 1) {
  return request(app)
    .post(base + '/pairing/' + id + '/approve')
    .set('Authorization', auth)
    .send({ code, setorId, ativoId, descricao: 'Medidor da produção' });
}

beforeAll(async () => {
  [gestor, outraEmpresa, tecnico] = await Promise.all([
    login('carla.mendes@aquaplas.com'),
    login('beatriz.nogueira@metaltec.com'),
    login('diego.ramos@siva.com'),
  ]);
});

describe('Pareamento do ESP32', () => {
  it('deduplica a descoberta e restringe a listagem e a aprovação à empresa responsável', async () => {
    const mac = '02:00:00:00:00:11';
    const esp = placa(mac);
    const { sessionId, code } = (await esp.descobrir().expect(200)).body.data;
    expect(code).toMatch(/^\d{6}$/);
    expect((await esp.descobrir().expect(200)).body.data).toMatchObject({ sessionId, code });
    await placa(mac).descobrir().expect(409);
    const pending = (
      await request(app)
        .get(base + '/pending')
        .set('Authorization', gestor)
        .expect(200)
    ).body.data;
    const same = pending.filter((p: { mac: string }) => p.mac === mac);
    expect(same).toHaveLength(1);
    expect(same[0]).toMatchObject({ id: sessionId, empresaId: 1, sensorId: 'fluxo' });
    for (const key of ['code', 'token', 'secret', 'secretHash', 'tokenHash'])
      expect(same[0]).not.toHaveProperty(key);
    const other = await request(app)
      .get(base + '/pending')
      .set('Authorization', outraEmpresa)
      .expect(200);
    expect(other.body.data).not.toContainEqual(expect.objectContaining({ id: sessionId }));
    await request(app)
      .get(base + '/pending')
      .expect(401);
    await aprovar(sessionId, code, tecnico).expect(403);
    await aprovar(sessionId, code, outraEmpresa).expect(403);
    await aprovar(sessionId, code, gestor, 3, 3).expect(403);
    await aprovar(sessionId, code, gestor, 1, 2).expect(422);
    await placa(mac).retirar(sessionId).expect(401);
    await esp.retirar(sessionId).expect(409);
    await request(app)
      .post(base + '/pairing/' + sessionId + '/reject')
      .set('Authorization', gestor)
      .expect(204);
    expect((await esp.consultar(sessionId).expect(200)).body.data.status).toBe('rejected');
    await aprovar(sessionId, code).expect(409);
  });

  it('aprova uma vez, tolera perda de resposta, registra leitura e permite revogar sem perder o vínculo', async () => {
    const mac = '02:00:00:00:00:22';
    const esp = placa(mac);
    const { sessionId, code } = (await esp.descobrir().expect(200)).body.data;
    const approvals = await Promise.all([aprovar(sessionId, code), aprovar(sessionId, code)]);
    expect(approvals.map((r) => r.status).sort()).toEqual([200, 409]);
    const device = approvals.find((r) => r.status === 200)!.body.data;
    expect(device).not.toHaveProperty('token');
    expect(device).not.toHaveProperty('tokenHash');
    expect((await esp.consultar(sessionId).expect(200)).body.data.status).toBe('approved');
    const { espId, token } = (await esp.retirar(sessionId).expect(200)).body.data;
    expect((await esp.retirar(sessionId).expect(200)).body.data.token).toBe(token);
    expect((await createDeviceRepository().findById(device.id))?.tokenHash).toBe(
      hashDeviceToken(token),
    );
    const ack = () =>
      request(app)
        .post(base + '/pairing/ack')
        .set('X-Token', token)
        .send({ sessionId });
    await ack().expect(204);
    await ack().expect(204);
    await esp.retirar(sessionId).expect(410);
    expect(
      (
        await request(app)
          .get(base + '/me')
          .set('X-Token', token)
          .expect(200)
      ).body.data.espId,
    ).toBe(espId);
    const reading = () =>
      request(app)
        .post('/api/readings')
        .set('X-Token', token)
        .send({ esp_id: espId, sensor_id: 'fluxo', vazao: 2.4 });
    const accepted = await reading().expect(201);
    const sensorId = accepted.body.data.sensorId;
    expect(sensorId).toEqual(expect.any(Number));
    const next = placa(mac);
    await next.descobrir().expect(409);
    await request(app)
      .post(base + '/' + device.id + '/revoke')
      .set('Authorization', outraEmpresa)
      .expect(403);
    await request(app)
      .post(base + '/' + device.id + '/revoke')
      .set('Authorization', gestor)
      .expect(204);
    await reading().expect(401);
    const renewed = (await next.descobrir().expect(200)).body.data;
    const again = await aprovar(renewed.sessionId, renewed.code).expect(200);
    expect(again.body.data.id).toBe(device.id);
    const fresh = (await next.retirar(renewed.sessionId).expect(200)).body.data.token;
    expect(fresh).not.toBe(token);
    const acceptedAgain = await request(app)
      .post('/api/readings')
      .set('X-Token', fresh)
      .send({ esp_id: espId, sensor_id: 'fluxo', vazao: 3 })
      .expect(201);
    expect(acceptedAgain.body.data.sensorId).toBe(sensorId);
    await request(app)
      .delete(base + '/' + device.id)
      .set('Authorization', gestor)
      .expect(409);
    const history = await request(app)
      .get('/api/readings')
      .query({ sensorId })
      .set('Authorization', gestor)
      .expect(200);
    expect(history.body.data).toHaveLength(2);
  });

  it('cria um ativo no pareamento, impede duplicata e mantém o vínculo na recuperação', async () => {
    const first = placa('02:00:00:00:00:55');
    const second = placa('02:00:00:00:00:56');
    const [a, b] = await Promise.all(
      [first, second].map(async (esp) => (await esp.descobrir().expect(200)).body.data),
    );
    const nome = 'Bomba de Reúso';
    const approveNew = (sessionId: string, code: string, name = nome) =>
      request(app)
        .post(base + '/pairing/' + sessionId + '/approve')
        .set('Authorization', gestor)
        .send({ code, setorId: 1, novoAtivo: { nome: name } });
    const list = () =>
      request(app)
        .get('/api/assets')
        .query({ setorId: 1 })
        .set('Authorization', gestor)
        .expect(200);

    await approveNew(a.sessionId, a.code === '000000' ? '000001' : '000000').expect(422);
    expect((await list()).body.data).not.toContainEqual(expect.objectContaining({ nome }));
    const approved = await approveNew(a.sessionId, a.code).expect(200);
    const ativo = (await list()).body.data.find((asset: { nome: string }) => asset.nome === nome);
    expect(ativo).toMatchObject({ setorId: 1, criticidade: 'media' });

    const duplicate = await approveNew(b.sessionId, b.code, 'bomba de reuso').expect(409);
    expect(duplicate.body.error.code).toBe('ASSET_ALREADY_EXISTS');
    await aprovar(b.sessionId, b.code, gestor, 1, ativo.id).expect(200);

    await request(app)
      .post(base + '/' + approved.body.data.id + '/revoke')
      .set('Authorization', gestor)
      .expect(204);
    const recovery = (await first.descobrir().expect(200)).body.data;
    await approveNew(recovery.sessionId, recovery.code, 'Ativo durante recuperação').expect(409);
    await aprovar(recovery.sessionId, recovery.code, gestor, 1, ativo.id).expect(200);
    expect((await list()).body.data).not.toContainEqual(
      expect.objectContaining({ nome: 'Ativo durante recuperação' }),
    );
  });

  it('limita tentativas e impede retirar uma credencial de sessão bloqueada', async () => {
    const esp = placa('02:00:00:00:00:33');
    const { sessionId, code } = (await esp.descobrir().expect(200)).body.data;
    const errado = code === '000000' ? '000001' : '000000';
    for (let n = 0; n < 4; n++) await aprovar(sessionId, errado).expect(422);
    await aprovar(sessionId, errado).expect(429);
    await aprovar(sessionId, code).expect(409);
    await esp.retirar(sessionId).expect(409);
  });

  it('expira a sessão e permite uma nova descoberta após o prazo', async () => {
    const esp = placa('02:00:00:00:00:44');
    const { sessionId, code, expiresAt } = (await esp.descobrir().expect(200)).body.data;
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(new Date(expiresAt).getTime() + 1));
      expect((await esp.consultar(sessionId).expect(200)).body.data.status).toBe('expired');
      await aprovar(sessionId, code).expect(410);
      await esp.retirar(sessionId).expect(410);
      expect((await esp.descobrir().expect(200)).body.data.sessionId).not.toBe(sessionId);
    } finally {
      vi.useRealTimers();
    }
  });
});
