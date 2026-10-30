import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/database/prisma.js';
import { createDeviceRepository } from '../../src/modules/devices/repositories/device.repository.js';

const suffix = randomBytes(5).toString('hex');
const macAddress = `02:${randomBytes(5).toString('hex').match(/../g)!.join(':')}`.toUpperCase();
const email = `pairing-${suffix}@siva.test`;
let companyId: number,
  sectorId: number,
  assetId: number,
  userId: number,
  deviceId: number | undefined;
let jwt: string;
beforeAll(async () => {
  const company = await prisma.empresa.create({ data: { nome: `Pairing ${suffix}` } });
  companyId = company.id;
  const sector = await prisma.setor.create({ data: { nome: 'Teste', empresaId: companyId } });
  sectorId = sector.id;
  assetId = (await prisma.ativo.create({ data: { nome: 'Tanque teste', setorId: sectorId } })).id;
  userId = (
    await prisma.usuario.create({
      data: {
        nome: 'Gestor teste',
        email,
        senha: await bcrypt.hash('test-password', 4),
        tipo: 'GESTOR',
        empresaId: companyId,
      },
    })
  ).id;
  const login = await request(createApp())
    .post('/api/auth/login')
    .send({ email, senha: 'test-password' });
  expect(login.status).toBe(200);
  jwt = login.body.data.token;
});
afterAll(async () => {
  if (deviceId) {
    const ids = (
      await prisma.sensor.findMany({ where: { esp32Id: deviceId }, select: { id: true } })
    ).map((row) => row.id);
    await prisma.leitura.deleteMany({ where: { sensorId: { in: ids } } });
    await prisma.sensor.deleteMany({ where: { esp32Id: deviceId } });
    await prisma.esp32.delete({ where: { id: deviceId } });
  }
  await prisma.devicePairing.deleteMany({ where: { macAddress } });
  if (userId) await prisma.usuario.delete({ where: { id: userId } });
  if (assetId) await prisma.ativo.delete({ where: { id: assetId } });
  if (sectorId) await prisma.setor.delete({ where: { id: sectorId } });
  if (companyId) await prisma.empresa.delete({ where: { id: companyId } });
  await prisma.$disconnect();
});

it('persiste a sessão, aprova atomicamente, guarda só hashes e aceita leituras depois de recriar a API/cliente do banco', async () => {
  let app = createApp();
  const secret = randomBytes(32).toString('hex');
  const start = await request(app)
    .post('/api/device-pairings/request')
    .set('X-Pairing-Key', secret)
    .send({ macAddress });
  expect(start.status).toBe(201);
  const code = start.body.data.code;
  const stored = await prisma.devicePairing.findUniqueOrThrow({ where: { macAddress } });
  expect(stored.secretHash).not.toBe(secret);
  expect(stored.codeHash).not.toBe(code);
  await prisma.$disconnect();
  app = createApp(); // next query reconnects to persisted rows
  const approvals = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post('/api/device-pairings/approve')
        .auth(jwt, { type: 'bearer' })
        .send({ code, ativoId: assetId }),
    ),
  );
  expect(approvals.filter((res) => res.status === 201)).toHaveLength(1);
  expect(approvals.filter((res) => [404, 409].includes(res.status))).toHaveLength(1);
  deviceId = approvals.find((res) => res.status === 201)!.body.data.device.id;
  const credentials = (
    await request(app)
      .post('/api/device-pairings/status')
      .set('X-Pairing-Key', secret)
      .send({ macAddress })
  ).body.data;
  expect(credentials.token).toMatch(/^dev-/);
  const device = await prisma.esp32.findUniqueOrThrow({ where: { id: deviceId } });
  expect(device.tokenHash).not.toBe(credentials.token);
  expect((await createDeviceRepository().list({ filter: { espId: 'does-not-exist' } })).total).toBe(
    0,
  );
  const body = { esp_id: credentials.espId, sensor_id: credentials.sensorId, vazao: 12.5 };
  expect(
    (await request(app).post('/api/readings').set('X-Token', credentials.token).send(body)).status,
  ).toBe(201);
  expect(
    (await request(app).delete(`/api/devices/${deviceId}`).auth(jwt, { type: 'bearer' })).status,
  ).toBe(409);
  await request(app)
    .post('/api/device-pairings/acknowledge')
    .set('X-Pairing-Key', secret)
    .send({ macAddress });
  await prisma.$disconnect();
  app = createApp();
  expect(
    (await request(app).post('/api/readings').set('X-Token', credentials.token).send(body)).status,
  ).toBe(201);
  expect(
    (
      await request(app)
        .post('/api/device-pairings/status')
        .set('X-Pairing-Key', secret)
        .send({ macAddress })
    ).body.data,
  ).toEqual({ status: 'DELIVERED' });
  const sensor = await prisma.sensor.findFirstOrThrow({ where: { esp32Id: deviceId } });
  expect(await prisma.leitura.count({ where: { sensorId: sensor.id } })).toBe(2);
  expect(
    (
      await request(app)
        .post(`/api/device-pairings/devices/${deviceId}/reset`)
        .auth(jwt, { type: 'bearer' })
    ).status,
  ).toBe(204);
  expect(
    (await request(app).post('/api/readings').set('X-Token', credentials.token).send(body)).status,
  ).toBe(401);
});
