import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('HTTPS no pareamento em produção', () => {
  it('rejeita HTTP direto e ignora o cabeçalho de proxy com a confiança desativada', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MOCK_MODE', 'false');
    vi.stubEnv('DATABASE_URL', 'mysql://teste@127.0.0.1:1/siva_test');
    vi.stubEnv('TRUST_PROXY_HOPS', '0');
    vi.stubEnv('JWT_SECRET', 'segredo-exclusivo-do-teste-local-de-transporte');
    vi.resetModules();
    const { createApp } = await import('../src/app.js');
    const app = createApp();
    for (const path of ['/api/devices/discovery', '/api/devices/credentials', '/api/readings']) {
      const response = await request(app).post(path).set('X-Forwarded-Proto', 'https').send({});
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('HTTPS_REQUIRED');
    }
  });
});
