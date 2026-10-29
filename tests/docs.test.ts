import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /docs', () => {
  it('serves a documentation page with the available API endpoints', async () => {
    const response = await request(app).get('/docs');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('SIVA API — Documentação');
    expect(response.text).toContain('/api/health');
    expect(response.text).toContain('/docs/openapi.json');
  });
});
