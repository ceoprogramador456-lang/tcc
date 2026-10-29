import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('POST /api/readings (ingestão via X-Token)', () => {
  it('aceita uma leitura válida do ESP32 autenticado', async () => {
    const response = await request(app)
      .post('/api/readings')
      .set('X-Token', 'dev-token-esp01')
      .send({ esp_id: 'esp_01', setor: 'producao', sensor_id: 'sensor_01', vazao: 13.5 });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ sensorId: 1, vazao: 13.5 });
  });

  it('rejeita token inválido com 401', async () => {
    const response = await request(app)
      .post('/api/readings')
      .set('X-Token', 'token-invalido')
      .send({ esp_id: 'esp_01', sensor_id: 'sensor_01', vazao: 10 });

    expect(response.status).toBe(401);
  });

  it('rejeita quando esp_id do payload não bate com o dispositivo autenticado', async () => {
    const response = await request(app)
      .post('/api/readings')
      .set('X-Token', 'dev-token-esp01')
      .send({ esp_id: 'esp_02', sensor_id: 'sensor_01', vazao: 10 });

    expect(response.status).toBe(403);
  });

  it('rejeita sensor_id inexistente para o dispositivo com 404', async () => {
    const response = await request(app)
      .post('/api/readings')
      .set('X-Token', 'dev-token-esp01')
      .send({ esp_id: 'esp_01', sensor_id: 'sensor_inexistente', vazao: 10 });

    expect(response.status).toBe(404);
  });
});
