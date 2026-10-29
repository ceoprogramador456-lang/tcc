import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDeviceRepository } from '../src/modules/devices/repositories/device.repository.js';
import { hashDeviceToken } from '../src/utils/device-token.js';

const app = createApp();

const ADMIN = { email: 'super@siva.com', senha: 'senha123' };
const GESTOR = { email: 'carla.mendes@aquaplas.com', senha: 'senha123' };
const TECNICO = { email: 'diego.ramos@aquaplas.com', senha: 'senha123' };

async function tokenDe(email: string, senha: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, senha });
  return response.body.data.token as string;
}

describe('Token do dispositivo ESP32', () => {
  it('persiste apenas o hash do token — o valor em claro não vai para o banco', async () => {
    const token = await tokenDe(ADMIN.email, ADMIN.senha);

    const response = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ setorId: 1, espId: 'esp_hash_teste', descricao: 'Teste de hash' });

    expect(response.status).toBe(201);
    expect(typeof response.body.data.token).toBe('string');
    expect(response.body.data.token).toMatch(/^dev-/);

    const repository = createDeviceRepository();
    const devices = await repository.list({
      page: 1,
      pageSize: 100,
      filter: { espId: 'esp_hash_teste' },
    });
    const device = devices.items[0];

    expect(device).toBeDefined();
    if (!device) throw new Error('dispositivo de teste não foi criado');
    expect(device.tokenHash).toBe(hashDeviceToken(response.body.data.token));
    expect(device.tokenHash).not.toBe(response.body.data.token);
    expect(JSON.stringify(device)).not.toContain(response.body.data.token);
  });

  it('não devolve o token (nem o hash) em listagens ou consultas', async () => {
    const token = await tokenDe(ADMIN.email, ADMIN.senha);

    const list = await request(app)
      .get('/api/devices?empresaId=1')
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain('tokenHash');
    for (const item of list.body.data) {
      expect(item.token).toBeUndefined();
      expect(item.tokenHash).toBeUndefined();
    }

    const single = await request(app).get('/api/devices/1').set('Authorization', `Bearer ${token}`);
    expect(single.status).toBe(200);
    expect(single.body.data.token).toBeUndefined();
    expect(single.body.data.tokenHash).toBeUndefined();
  });

  it('o token devolvido na criação autentica a ingestão via X-Token', async () => {
    const token = await tokenDe(ADMIN.email, ADMIN.senha);

    const created = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ setorId: 1, espId: 'esp_x_token', descricao: 'Teste X-Token' });

    const deviceToken = created.body.data.token as string;
    const sensor = await request(app)
      .post('/api/sensors')
      .set('Authorization', `Bearer ${token}`)
      .send({ ativoId: 1, esp32Id: created.body.data.id, sensorId: 'sensor_xt' });

    expect(sensor.status).toBe(201);

    const reading = await request(app)
      .post('/api/readings')
      .set('X-Token', deviceToken)
      .send({ esp_id: 'esp_x_token', sensor_id: 'sensor_xt', vazao: 5 });

    expect(reading.status).toBe(201);
  });

  it('recusa esp_id duplicado com 409', async () => {
    const token = await tokenDe(ADMIN.email, ADMIN.senha);

    const response = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ setorId: 1, espId: 'esp_01' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('informa o estado online/offline a partir do último contato', async () => {
    const token = await tokenDe(ADMIN.email, ADMIN.senha);

    const response = await request(app)
      .get('/api/devices?empresaId=1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    for (const device of response.body.data) {
      expect(typeof device.online).toBe('boolean');
    }

    // `esp_01` recebeu leitura no seed (último contato recente) -> online.
    const esp01 = response.body.data.find((d: { espId: string }) => d.espId === 'esp_01');
    expect(esp01.online).toBe(true);
  });
});

describe('Escopo multiempresa dos recursos operacionais', () => {
  let adminToken = '';
  let gestorToken = '';
  let tecnicoToken = '';

  beforeAll(async () => {
    adminToken = await tokenDe(ADMIN.email, ADMIN.senha);
    gestorToken = await tokenDe(GESTOR.email, GESTOR.senha);
    tecnicoToken = await tokenDe(TECNICO.email, TECNICO.senha);
  });

  it('ADMIN lista ativos e dispositivos de todas as empresas', async () => {
    const assets = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assets.status).toBe(200);
    expect(assets.body.meta.total).toBeGreaterThanOrEqual(3);

    const devices = await request(app)
      .get('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(devices.status).toBe(200);
    expect(devices.body.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('GESTOR só enxerga os recursos da própria empresa', async () => {
    const assets = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(assets.status).toBe(200);
    // Aquaplás (empresa 1) tem 2 ativos; Metaltec (empresa 2) tem 1.
    expect(assets.body.meta.total).toBe(2);
  });

  it('GESTOR não consegue filtrar por outra empresa (403)', async () => {
    const assets = await request(app)
      .get('/api/assets?empresaId=2')
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(assets.status).toBe(403);
  });

  it('TECNICO também fica restrito à própria empresa', async () => {
    const admin = await request(app)
      .get('/api/sensors')
      .set('Authorization', `Bearer ${adminToken}`);
    const sensors = await request(app)
      .get('/api/sensors')
      .set('Authorization', `Bearer ${tecnicoToken}`);

    expect(sensors.status).toBe(200);
    // O técnico vê menos (ou igual) sensores que o admin global.
    expect(sensors.body.meta.total).toBeLessThan(admin.body.meta.total);
    expect(sensors.body.meta.total).toBeGreaterThan(0);
  });

  it('um recurso de outra empresa não é acessível por ID (404/403)', async () => {
    // `esp_03` pertence à Metaltec (empresa 2).
    const response = await request(app)
      .get('/api/devices/3')
      .set('Authorization', `Bearer ${tecnicoToken}`);

    expect([403, 404]).toContain(response.status);
  });

  it('TECNICO não pode criar dispositivos (só ADMIN e GESTOR)', async () => {
    const response = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ setorId: 1, espId: 'esp_negado' });

    expect(response.status).toBe(403);
  });
});

describe('Relacionamentos entre setor, ativo, ESP32 e sensor', () => {
  let adminToken = '';

  beforeAll(async () => {
    adminToken = await tokenDe(ADMIN.email, ADMIN.senha);
  });

  it('recusa sensor cujo ativo e ESP32 estão em setores diferentes (422)', async () => {
    // Ativo #3 é da Metaltec; ESP32 #1 é da Aquaplás.
    const response = await request(app)
      .post('/api/sensors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ativoId: 3, esp32Id: 1, sensorId: 'sensor_setor_divergente' });

    expect(response.status).toBe(422);
  });

  it('recusa sensor com sensor_id já usado no mesmo ESP32 (409)', async () => {
    const response = await request(app)
      .post('/api/sensors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ativoId: 1, esp32Id: 1, sensorId: 'sensor_01' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('recusa sensor com tag já usada (409)', async () => {
    const response = await request(app)
      .post('/api/sensors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ativoId: 1, esp32Id: 1, sensorId: 'sensor_tag_duplicada', tag: 'SN-PRD-001' });

    expect(response.status).toBe(409);
  });

  it('recusa mover um dispositivo com sensores para outro setor (409)', async () => {
    const response = await request(app)
      .patch('/api/devices/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ setorId: 3 });

    expect(response.status).toBe(409);
  });

  it('recusa mover um ativo com sensores para outro setor (409)', async () => {
    const response = await request(app)
      .patch('/api/assets/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ setorId: 3 });

    expect(response.status).toBe(409);
  });
});

describe('Dashboard operacional (GET /api/dashboard/overview)', () => {
  let adminToken = '';
  let gestorToken = '';

  beforeAll(async () => {
    adminToken = await tokenDe(ADMIN.email, ADMIN.senha);
    gestorToken = await tokenDe(GESTOR.email, GESTOR.senha);
  });

  it('devolve indicadores calculados a partir dos dados reais', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    const data = response.body.data;

    // Os totais do painel precisam bater com a listagem de sensores.
    const sensors = await request(app)
      .get('/api/sensors?pageSize=100')
      .set('Authorization', `Bearer ${adminToken}`);
    const devices = await request(app)
      .get('/api/devices?pageSize=100')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(data.sensores.total).toBe(sensors.body.meta.total);
    expect(data.esp32.total).toBe(devices.body.meta.total);
    expect(data.sensores.ativos).toBeLessThanOrEqual(data.sensores.total);
    expect(data.esp32.online).toBeLessThanOrEqual(data.esp32.total);
    expect(data.manutencoes.total).toBeGreaterThanOrEqual(data.manutencoes.pendentes);
    expect(data.consumoAtual).not.toBeNull();
    expect(data.consumoAtual.unidade).toBe('L/min');
    expect(data.consumoDiario).not.toBeNull();
    expect(data.consumoDiario.unidade).toBe('L');
    expect(data.periodo.inicio).toBeTruthy();
  });

  it('alertas vem como indisponível (sem fonte de dados), nunca como número', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.body.data.alertas.disponivel).toBe(false);
    expect(response.body.data.alertas.total).toBeNull();
  });

  it('atividades são eventos registrados, não registros inventados', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    const atividades = response.body.data.atividades;
    expect(Array.isArray(atividades)).toBe(true);
    expect(atividades.length).toBeGreaterThan(0);

    for (const atividade of atividades) {
      expect(['leitura', 'manutencao', 'dispositivo']).toContain(atividade.tipo);
      expect(atividade.occurredAt).toBeTruthy();
      expect(Number.isNaN(new Date(atividade.occurredAt).getTime())).toBe(false);
    }
  });

  it('respeita o escopo da empresa do usuário (GESTOR)', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(response.status).toBe(200);

    const admin = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    // O painel do gestor enxerga um subconjunto do painel global.
    expect(response.body.data.sensores.total).toBeLessThan(admin.body.data.sensores.total);
    expect(response.body.data.sensores.total).toBeGreaterThan(0);
    expect(response.body.data.esp32.total).toBeLessThan(admin.body.data.esp32.total);
  });

  it('GESTOR não consegue consultar o painel de outra empresa (403)', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview?empresaId=2')
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(response.status).toBe(403);
  });
});
