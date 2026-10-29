import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('POST /api/auth/login', () => {
  it('autentica com credenciais válidas e retorna um token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla.mendes@aquaplas.com', senha: 'senha123' });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).toMatchObject({ email: 'carla.mendes@aquaplas.com' });
    expect(response.body.data.user.senha).toBeUndefined();
  });

  it('normaliza espaços e maiúsculas no e-mail de login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  CARLA.MENDES@AQUAPLAS.COM  ', senha: 'senha123' });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('carla.mendes@aquaplas.com');
  });

  it('rejeita senha incorreta com 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla.mendes@aquaplas.com', senha: 'senha-errada' });

    expect(response.status).toBe(401);
  });

  it('rejeita payload inválido com 422', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'nao-e-email' });

    expect(response.status).toBe(422);
  });
});

describe('acesso a recursos autenticados', () => {
  let token: string;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla.mendes@aquaplas.com', senha: 'senha123' });
    token = login.body.data.token;
  });

  it('rejeita requisição sem token com 401', async () => {
    const response = await request(app).get('/api/companies');
    expect(response.status).toBe(401);
  });

  it('lista apenas a própria empresa para um GESTOR', async () => {
    const response = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].nome).toBe('Aquaplás Indústria Ltda');
  });

  it('bloqueia acesso a setor de outra empresa com 403', async () => {
    const response = await request(app)
      .get('/api/sectors/3')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
