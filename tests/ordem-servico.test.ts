import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { companies, ordensServico, users } from '../src/shared/mock/mock-store.js';

const app = createApp();

const adminUser = users.findOne((user) => user.tipo === 'ADMIN')!;
const carlaUser = users.findOne((user) => user.email === 'carla.mendes@aquaplas.com')!;
const diegoUser = users.findOne((user) => user.email === 'diego.ramos@siva.com')!;
const marcosUser = users.findOne((user) => user.email === 'marcos.vinicius@siva.com')!;

const aquaplas = companies.list().find((company) => company.nome === 'Aquaplás Indústria Ltda')!;

const marcosOrdem = ordensServico.list().find((ordem) => ordem.funcionarioId === marcosUser.id)!;

let createdOrdemId = 0;

async function login(email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, senha: 'senha123' });
  expect(response.status).toBe(200);
  return response.body.data.token as string;
}

describe('Solicitações de serviço — bloqueio das telas operacionais para o ADMIN', () => {
  it('bloqueia Visão geral (GET /api/dashboard/overview) com 403', async () => {
    const token = await login('super@siva.com');
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('bloqueia Equipamentos (GET /api/assets) com 403', async () => {
    const token = await login('super@siva.com');
    const response = await request(app).get('/api/assets').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('deixa Visão geral e Equipamentos disponíveis para GESTOR', async () => {
    const gestor = await login('carla.mendes@aquaplas.com');
    const dashboard = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${gestor}`);
    expect(dashboard.status).toBe(200);

    const assets = await request(app).get('/api/assets').set('Authorization', `Bearer ${gestor}`);
    expect(assets.status).toBe(200);
  });

  it('bloqueia Visão geral e Equipamentos para TECNICO (403)', async () => {
    const tecnico = await login('diego.ramos@siva.com');
    const dashboard = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${tecnico}`);
    expect(dashboard.status).toBe(403);

    const assets = await request(app).get('/api/assets').set('Authorization', `Bearer ${tecnico}`);
    expect(assets.status).toBe(403);
  });
});

describe('Solicitações de serviço — GESTOR', () => {
  it('gestor cria a solicitação com status "aberto", empresa e solicitante derivados do ator', async () => {
    const token = await login('carla.mendes@aquaplas.com');
    const response = await request(app)
      .post('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Troca do tanque de ETA 02',
        tipo: 'preventiva',
        descricao: 'Troca de gaskets no tanque.',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      nome: 'Troca do tanque de ETA 02',
      tipo: 'preventiva',
      status: 'aberto',
      empresaId: aquaplas.id,
      solicitanteId: carlaUser.id,
      funcionarioId: null,
      aceitoPor: null,
      aceitoEm: null,
      concluidoEm: null,
    });

    createdOrdemId = response.body.data.id;
  });

  it('gestor vê só as solicitações da empresa dele (isolamento por empresa)', async () => {
    const carlaToken = await login('carla.mendes@aquaplas.com');
    const beatrizToken = await login('beatriz.nogueira@metaltec.com');

    const carlaList = await request(app)
      .get('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${carlaToken}`);
    expect(carlaList.status).toBe(200);
    expect(carlaList.body.data.some((ordem: { id: number }) => ordem.id === createdOrdemId)).toBe(
      true,
    );
    for (const ordem of carlaList.body.data) {
      expect(ordem.empresaId).toBe(aquaplas.id);
    }

    const beatrizList = await request(app)
      .get('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${beatrizToken}`);
    expect(beatrizList.status).toBe(200);
    expect(beatrizList.body.data.some((ordem: { id: number }) => ordem.id === createdOrdemId)).toBe(
      false,
    );
  });

  it('ADMIN não cria OS (a criação é do GESTOR da empresa cliente)', async () => {
    const token = await login('super@siva.com');
    const response = await request(app)
      .post('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'OS criada pelo admin', tipo: 'inspecao' });
    expect(response.status).toBe(403);
  });
});

describe('Solicitações de serviço — ADMIN aceita/conclui', () => {
  it('admin aceita com técnico da SIVA: status em_andamento, funcionário + responsável registrados', async () => {
    const token = await login('super@siva.com');
    const response = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/aceitar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ funcionarioId: diegoUser.id });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: createdOrdemId,
      status: 'em_andamento',
      funcionarioId: diegoUser.id,
      aceitoPor: adminUser.id,
    });
    expect(response.body.data.aceitoEm).toBeTruthy();
  });

  it('rejeita aceitar quando o status não é "aberto"', async () => {
    const token = await login('super@siva.com');
    const response = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/aceitar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ funcionarioId: diegoUser.id });
    expect(response.status).toBe(422);
  });

  it('admin conclui com status "em_andamento": status concluido com concluidoEm', async () => {
    const token = await login('super@siva.com');
    const response = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/concluir`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: createdOrdemId, status: 'concluido' });
    expect(response.body.data.concluidoEm).toBeTruthy();
  });

  it('rejeita concluir quando o status não é "em_andamento"', async () => {
    const token = await login('super@siva.com');
    const response = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/concluir`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(422);
  });

  it('gestor não aceita nem conclui', async () => {
    const token = await login('carla.mendes@aquaplas.com');
    const accept = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/aceitar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ funcionarioId: diegoUser.id });
    expect(accept.status).toBe(403);

    const complete = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/concluir`)
      .set('Authorization', `Bearer ${token}`);
    expect(complete.status).toBe(403);
  });

  it('rejeita designar um técnico de empresa cliente (422)', async () => {
    const carlaToken = await login('carla.mendes@aquaplas.com');
    const adminToken = await login('super@siva.com');

    const createResponse = await request(app)
      .post('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${carlaToken}`)
      .send({ nome: 'OS para técnico de cliente', tipo: 'inspecao' });
    expect(createResponse.status).toBe(201);

    const response = await request(app)
      .post(`/api/solicitacoes-servico/${createResponse.body.data.id}/aceitar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ funcionarioId: carlaUser.id });
    expect([403, 422]).toContain(response.status);
  });
});

describe('Solicitações de serviço — escopo do TECNICO', () => {
  it('técnico lista somente as ordens designadas a ele', async () => {
    const token = await login('diego.ramos@siva.com');
    const response = await request(app)
      .get('/api/solicitacoes-servico?pageSize=100')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.some((ordem: { id: number }) => ordem.id === createdOrdemId)).toBe(
      true,
    );
    for (const ordem of response.body.data) {
      expect(ordem.funcionarioId).toBe(diegoUser.id);
    }
    expect(response.body.data.some((ordem: { id: number }) => ordem.id === marcosOrdem.id)).toBe(
      false,
    );
  });

  it('outro técnico não vê a ordem do primeiro', async () => {
    const token = await login('marcos.vinicius@siva.com');
    const response = await request(app)
      .get('/api/solicitacoes-servico?pageSize=100')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.some((ordem: { id: number }) => ordem.id === createdOrdemId)).toBe(
      false,
    );
    for (const ordem of response.body.data) {
      expect(ordem.funcionarioId).toBe(marcosUser.id);
    }
  });

  it('técnico abre o detalhe da própria OS e recebe 403 na OS de outro', async () => {
    const token = await login('diego.ramos@siva.com');

    const own = await request(app)
      .get(`/api/solicitacoes-servico/${createdOrdemId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    expect(own.body.data.id).toBe(createdOrdemId);

    const another = await request(app)
      .get(`/api/solicitacoes-servico/${marcosOrdem.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(another.status).toBe(403);
  });

  it('técnico não cria, aceita, conclui nem altera funcionário (403)', async () => {
    const token = await login('diego.ramos@siva.com');

    const create = await request(app)
      .post('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'OS do técnico', tipo: 'inspecao' });
    expect(create.status).toBe(403);

    const accept = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/aceitar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ funcionarioId: diegoUser.id });
    expect(accept.status).toBe(403);

    const complete = await request(app)
      .post(`/api/solicitacoes-servico/${createdOrdemId}/concluir`)
      .set('Authorization', `Bearer ${token}`);
    expect(complete.status).toBe(403);

    const patch = await request(app)
      .patch(`/api/solicitacoes-servico/${createdOrdemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ funcionarioId: diegoUser.id });
    expect(patch.status).toBe(403);
  });
});

describe('Solicitações de serviço — Detalhe e troca do funcionário responsável', () => {
  it('GET /api/solicitacoes-servico/:id retorna o detalhe (ADMIN) e nega GESTOR (403)', async () => {
    const adminToken = await login('super@siva.com');
    const detail = await request(app)
      .get(`/api/solicitacoes-servico/${createdOrdemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: createdOrdemId });

    const gestorToken = await login('carla.mendes@aquaplas.com');
    const denied = await request(app)
      .get(`/api/solicitacoes-servico/${createdOrdemId}`)
      .set('Authorization', `Bearer ${gestorToken}`);
    expect(denied.status).toBe(403);
  });

  it('PATCH altera funcionário em ordem aberta — status permanece "aberto"', async () => {
    const carlaToken = await login('carla.mendes@aquaplas.com');
    const adminToken = await login('super@siva.com');

    const createResponse = await request(app)
      .post('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${carlaToken}`)
      .send({ nome: 'Troca de funcionário em ordem aberta', tipo: 'preventiva' });
    expect(createResponse.status).toBe(201);
    const novoId = createResponse.body.data.id;

    const patchResponse = await request(app)
      .patch(`/api/solicitacoes-servico/${novoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ funcionarioId: diegoUser.id });
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.data).toMatchObject({
      id: novoId,
      status: 'aberto',
      funcionarioId: diegoUser.id,
    });
  });

  it('PATCH em ordem concluída é recusado (422)', async () => {
    const adminToken = await login('super@siva.com');
    const response = await request(app)
      .patch(`/api/solicitacoes-servico/${createdOrdemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ funcionarioId: diegoUser.id });
    expect(response.status).toBe(422);
  });

  it('PATCH com funcionario_id inválido é recusado (404)', async () => {
    const carlaToken = await login('carla.mendes@aquaplas.com');
    const adminToken = await login('super@siva.com');

    const createResponse = await request(app)
      .post('/api/solicitacoes-servico')
      .set('Authorization', `Bearer ${carlaToken}`)
      .send({ nome: 'Troca com funcionário inexistente', tipo: 'inspecao' });
    expect(createResponse.status).toBe(201);

    const response = await request(app)
      .patch(`/api/solicitacoes-servico/${createResponse.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ funcionarioId: 999999 });
    expect(response.status).toBe(404);
  });
});
