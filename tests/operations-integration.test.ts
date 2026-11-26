import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

const ADMIN = { email: 'super@siva.com', senha: 'senha123' };
const GESTOR = { email: 'carla.mendes@aquaplas.com', senha: 'senha123' };
const TECNICO = { email: 'diego.ramos@siva.com', senha: 'senha123' };

async function tokenDe(email: string, senha: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, senha });
  return response.body.data.token as string;
}

describe('Token do dispositivo ESP32', () => {
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

  it('ADMIN não acessa ativos — GESTOR enxerga os da própria empresa', async () => {
    const assetsAdmin = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assetsAdmin.status).toBe(403);

    const assets = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${gestorToken}`);
    expect(assets.status).toBe(200);
    expect(assets.body.meta.total).toBe(2);

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

  it('TECNICO não acessa sensores nem outros módulos operacionais (403)', async () => {
    const sensors = await request(app)
      .get('/api/sensors')
      .set('Authorization', `Bearer ${tecnicoToken}`);
    expect(sensors.status).toBe(403);

    for (const path of [
      '/api/assets',
      '/api/devices',
      '/api/maintenances?sensorId=1',
      '/api/alerts',
      '/api/readings?sensorId=1',
      '/api/companies',
      '/api/users',
      '/api/dashboard/overview',
    ]) {
      const response = await request(app).get(path).set('Authorization', `Bearer ${tecnicoToken}`);
      expect(response.status, path).toBe(403);
    }
  });

  it('TECNICO não acessa dispositivo por ID (403)', async () => {
    const response = await request(app)
      .get('/api/devices/3')
      .set('Authorization', `Bearer ${tecnicoToken}`);

    expect(response.status).toBe(403);
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
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(response.status).toBe(200);
    const data = response.body.data;

    // Os totais do painel precisam bater com a listagem de sensores.
    const sensors = await request(app)
      .get('/api/sensors?pageSize=100')
      .set('Authorization', `Bearer ${gestorToken}`);
    const devices = await request(app)
      .get('/api/devices?pageSize=100')
      .set('Authorization', `Bearer ${gestorToken}`);

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
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.alertas.disponivel).toBe(false);
    expect(response.body.data.alertas.total).toBeNull();
  });

  it('atividades são eventos registrados, não registros inventados', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${gestorToken}`);

    const atividades = response.body.data.atividades;
    expect(Array.isArray(atividades)).toBe(true);
    expect(atividades.length).toBeGreaterThan(0);

    for (const atividade of atividades) {
      expect(['leitura', 'manutencao', 'dispositivo']).toContain(atividade.tipo);
      expect(atividade.occurredAt).toBeTruthy();
      expect(Number.isNaN(new Date(atividade.occurredAt).getTime())).toBe(false);
    }
  });

  it('ADMIN não acessa o painel operacional; GESTOR vê os indicadores', async () => {
    const admin = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(admin.status).toBe(403);

    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sensores.total).toBeGreaterThan(0);
  });

  it('respeita o escopo da empresa do usuário (GESTOR)', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(response.status).toBe(200);

    const sensors = await request(app)
      .get('/api/sensors')
      .set('Authorization', `Bearer ${gestorToken}`);
    expect(response.body.data.sensores.total).toBe(sensors.body.meta.total);
    expect(response.body.data.sensores.total).toBeGreaterThan(0);
  });

  it('GESTOR não consegue consultar o painel de outra empresa (403)', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview?empresaId=2')
      .set('Authorization', `Bearer ${gestorToken}`);

    expect(response.status).toBe(403);
  });
});
