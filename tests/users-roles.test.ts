import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

let adminToken = '';
let gestorToken = '';
let tecnicoToken = '';

interface LoginResult {
  status: number;
  body: { data: { token: string; user: Record<string, unknown> } };
}

async function login(email: string, senha = 'senha123'): Promise<LoginResult> {
  const res = await request(app).post('/api/auth/login').send({ email, senha });
  return { status: res.status, body: res.body };
}

describe('AUTH com novos roles', () => {
  it('login ADMIN retorna tipo/especialidade/status', async () => {
    const { status, body } = await login('super@siva.com');
    expect(status).toBe(200);
    expect(body.data.user).toMatchObject({
      tipo: 'ADMIN',
      especialidade: null,
      status: 'ATIVO',
      empresaId: null,
    });
    adminToken = body.data.token;
  });

  it('login GESTOR', async () => {
    const { status, body } = await login('carla.mendes@aquaplas.com');
    expect(status).toBe(200);
    expect(body.data.user).toMatchObject({ tipo: 'GESTOR', status: 'ATIVO' });
    gestorToken = body.data.token;
  });

  it('login TECNICO MECANICO', async () => {
    const { status, body } = await login('diego.ramos@aquaplas.com');
    expect(status).toBe(200);
    expect(body.data.user).toMatchObject({
      tipo: 'TECNICO',
      especialidade: 'MECANICO',
      status: 'ATIVO',
    });
    tecnicoToken = body.data.token;
  });

  it('/auth/me retorna o usuário autenticado', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tipo).toBe('ADMIN');
  });
});

describe('USUÁRIOS (somente ADMIN escreve)', () => {
  let tecnicoEletricistaId = 0;
  let gestorId = 0;

  it('ADMIN cria GESTOR', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Gestor Teste',
        email: 'gestor.teste@aquaplas.com',
        senha: 'senha123',
        tipo: 'GESTOR',
        empresaId: 1,
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ tipo: 'GESTOR', empresaId: 1, status: 'ATIVO' });
    gestorId = res.body.data.id;
  });

  it('ADMIN cria TECNICO ELETRICISTA', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Tec Ele',
        email: 'tec.ele@aquaplas.com',
        senha: 'senha123',
        tipo: 'TECNICO',
        empresaId: 1,
        especialidade: 'ELETRICISTA',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.especialidade).toBe('ELETRICISTA');
    tecnicoEletricistaId = res.body.data.id;
  });

  it('ADMIN cria outro ADMIN sem empresa', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Admin 2', email: 'admin2@siva.com', senha: 'senha123', tipo: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.empresaId).toBeNull();
  });

  it('rejeita TECNICO sem especialidade (422)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Sem Esp',
        email: 'sem.esp@aquaplas.com',
        senha: 'senha123',
        tipo: 'TECNICO',
        empresaId: 1,
      });
    expect(res.status).toBe(422);
  });

  it('rejeita GESTOR sem empresa (422)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Sem Emp', email: 'sem.emp@x.com', senha: 'senha123', tipo: 'GESTOR' });
    expect(res.status).toBe(422);
  });

  it('rejeita ADMIN com empresa (422)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Admin Emp',
        email: 'admin.emp@x.com',
        senha: 'senha123',
        tipo: 'ADMIN',
        empresaId: 1,
      });
    expect(res.status).toBe(422);
  });

  it('rejeita e-mail duplicado (409)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Dup',
        email: 'tec.ele@aquaplas.com',
        senha: 'senha123',
        tipo: 'TECNICO',
        empresaId: 1,
        especialidade: 'MECANICO',
      });
    expect(res.status).toBe(409);
  });

  it('GESTOR não cria usuário (403)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${gestorToken}`)
      .send({
        nome: 'X',
        email: 'x@aquaplas.com',
        senha: 'senha123',
        tipo: 'TECNICO',
        empresaId: 1,
        especialidade: 'MECANICO',
      });
    expect(res.status).toBe(403);
  });

  it('TECNICO não cria usuário (403)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({
        nome: 'Y',
        email: 'y@aquaplas.com',
        senha: 'senha123',
        tipo: 'TECNICO',
        empresaId: 1,
        especialidade: 'MECANICO',
      });
    expect(res.status).toBe(403);
  });

  it('filtros combinados: tipo + status', async () => {
    const res = await request(app)
      .get('/api/users?tipo=TECNICO&status=ATIVO')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.totalPages).toEqual(expect.any(Number));
    for (const u of res.body.data) expect(u.tipo).toBe('TECNICO');
  });

  it('GESTOR lista somente a própria empresa', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${gestorToken}`);
    expect(res.status).toBe(200);
    for (const u of res.body.data) expect(u.empresaId).toBe(1);
  });

  it('ADMIN edita usuário (nome + especialidade)', async () => {
    const res = await request(app)
      .patch(`/api/users/${tecnicoEletricistaId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Tec Ele Atualizado', especialidade: 'MECANICO' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nome: 'Tec Ele Atualizado', especialidade: 'MECANICO' });
  });

  it('inativa usuário e login passa a falhar', async () => {
    const activeLogin = await login('tec.ele@aquaplas.com');
    expect(activeLogin.status).toBe(200);
    const activeToken = activeLogin.body.data.token;

    const statusRes = await request(app)
      .patch(`/api/users/${tecnicoEletricistaId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INATIVO' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('INATIVO');

    const blockedRequest = await request(app)
      .get('/api/sectors')
      .set('Authorization', `Bearer ${activeToken}`);
    expect(blockedRequest.status).toBe(403);

    const attempt = await login('tec.ele@aquaplas.com');
    expect([401, 403]).toContain(attempt.status);

    const reativa = await request(app)
      .patch(`/api/users/${tecnicoEletricistaId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ATIVO' });
    expect(reativa.status).toBe(200);

    const okLogin = await login('tec.ele@aquaplas.com');
    expect(okLogin.status).toBe(200);

    const reactivatedTokenRequest = await request(app)
      .get('/api/sectors')
      .set('Authorization', `Bearer ${activeToken}`);
    expect(reactivatedTokenRequest.status).toBe(200);
  });

  it('GESTOR não altera status (403)', async () => {
    const res = await request(app)
      .patch(`/api/users/${gestorId}/status`)
      .set('Authorization', `Bearer ${gestorToken}`)
      .send({ status: 'INATIVO' });
    expect(res.status).toBe(403);
  });

  it('GESTOR não exclui usuário (403) e ADMIN exclui (204)', async () => {
    const forbidden = await request(app)
      .delete(`/api/users/${gestorId}`)
      .set('Authorization', `Bearer ${gestorToken}`);
    expect(forbidden.status).toBe(403);

    const removed = await request(app)
      .delete(`/api/users/${gestorId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(204);
  });
});

describe('EMPRESAS + DASHBOARD', () => {
  it('ADMIN lista todas; GESTOR só a própria', async () => {
    const admin = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(admin.body.data.length).toBeGreaterThanOrEqual(2);
    const gestor = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${gestorToken}`);
    expect(gestor.body.data).toHaveLength(1);
  });

  it('GESTOR não cria empresa (403)', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${gestorToken}`)
      .send({ nome: 'Invasora' });
    expect(res.status).toBe(403);
  });

  it('GET /companies/:id/details (ADMIN)', async () => {
    const res = await request(app)
      .get('/api/companies/1/details')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('empresa');
    expect(res.body.data).toHaveProperty('funcionarios');
    expect(res.body.data).toHaveProperty('setores');
    expect(res.body.data.resumo).toMatchObject({
      funcionarios: expect.any(Number),
      setores: expect.any(Number),
      esp32: expect.any(Number),
      sensores: expect.any(Number),
    });
  });

  it('GET /companies/:id/users (ADMIN) sem senha', async () => {
    const res = await request(app)
      .get('/api/companies/1/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    for (const u of res.body.data) expect(u.senha).toBeUndefined();
  });

  it('GESTOR não acessa details de outra empresa (403)', async () => {
    const res = await request(app)
      .get('/api/companies/2/details')
      .set('Authorization', `Bearer ${gestorToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /dashboard/admin-summary com números reais', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin-summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.nEmpresas).toBeGreaterThanOrEqual(2);
    expect(res.body.data.nSensores).toBeGreaterThanOrEqual(1);
    expect(res.body.data.nEsp32).toBeGreaterThanOrEqual(1);
  });

  it('GESTOR não acessa dashboard admin (403)', async () => {
    const res = await request(app)
      .get('/api/dashboard/admin-summary')
      .set('Authorization', `Bearer ${gestorToken}`);
    expect(res.status).toBe(403);
  });
});

describe('ESP32 / SENSORES preservados', () => {
  it('POST /devices retorna token uma vez; GET não retorna', async () => {
    const created = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ setorId: 1, espId: 'esp_teste_99', descricao: 'teste' });
    expect(created.status).toBe(201);
    expect(created.body.data.token).toEqual(expect.any(String));

    const fetched = await request(app)
      .get(`/api/devices/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.token).toBeUndefined();
  });
});
