# Testes

## Stack

[Vitest](https://vitest.dev/) + [Supertest](https://github.com/ladjs/supertest), configurados em [`vitest.config.ts`](../vitest.config.ts). Os testes sobem a aplicação Express de verdade (`createApp()`) e fazem requisições HTTP reais contra ela em memória — não é teste unitário isolado de função, é teste de integração ponta a ponta (rota → middleware → controller → service → repository).

## Como rodar

```bash
npm test              # roda uma vez e sai (usado no CI)
npm run test:watch    # modo watch, para desenvolvimento
npm run test:coverage # com relatório de cobertura (texto + html em coverage/)
```

Os testes **sempre** rodam com `MOCK_MODE=true` (forçado em `vitest.config.ts`, via `test.env`) — não precisam de MySQL disponível, nem localmente nem no CI. Isso é o mesmo motivo por trás do modo mock em desenvolvimento: a suíte de testes é só mais um "consumidor" da mesma API fake.

```ts
// vitest.config.ts
test: {
  env: {
    NODE_ENV: 'test',
    MOCK_MODE: 'true',
    JWT_SECRET: 'test-secret-do-not-use-in-production',
  },
}
```

## O que existe hoje

| Arquivo | Cobre |
| --- | --- |
| [`tests/health.test.ts`](../tests/health.test.ts) | `GET /api/health` responde 200 com `mockMode: true` |
| [`tests/auth.test.ts`](../tests/auth.test.ts) | Login (sucesso, senha errada → 401, payload inválido → 422); acesso sem token → 401; escopo por empresa (`admin_empresa` só vê a própria empresa); acesso cross-tenant → 403 |
| [`tests/readings.test.ts`](../tests/readings.test.ts) | Ingestão de leitura via `X-Token` (sucesso → 201); token inválido → 401; `esp_id` do payload não bate com o dono do token → 403; `sensor_id` inexistente → 404 |

11 testes no total, todos de integração — nenhum teste unitário isolado de service/repository ainda.

## Estratégia de cobertura

Nesta etapa, a prioridade foi cobrir os pontos onde um bug vira um **problema de segurança/autorização** (login, escopo multi-tenant, autenticação de dispositivo) — não cobertura ampla de CRUD trivial de cada um dos 10 módulos. 🚧 **Ainda faltam** (próximos passos naturais):

- Teste de cada CRUD (companies/sectors/assets/devices/sensors/maintenances) cobrindo as regras de negócio de [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md) — ex.: criar sensor com ativo e ESP32 de setores diferentes deve dar 422.
- Teste da regra "só `super_admin` cria outro `super_admin`" (`user.service.ts`).
- Teste unitário do repository Prisma (hoje só o caminho mock é exercitado pelos testes; o caminho Prisma só é validado manualmente/pelo typecheck).
- `npm run test:coverage` ainda não tem um piso mínimo (threshold) configurado — cobertura é medida, mas não é obrigatória no CI.

## Como escrever um teste novo

Convenção: um arquivo por área de funcionalidade em `tests/*.test.ts`, importando `createApp()` uma vez no topo do arquivo (não por teste — os testes de um mesmo arquivo compartilham o mesmo estado em memória, de propósito, para poder testar sequências como "cria X, depois lista X").

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /api/sectors', () => {
  it('exige autenticação', async () => {
    const response = await request(app).get('/api/sectors');
    expect(response.status).toBe(401);
  });
});
```

Para testar uma rota autenticada, faça login primeiro (como em `tests/auth.test.ts`) e reaproveite o token com `beforeAll`. Os usuários e dados de exemplo disponíveis no mock estão documentados no [README raiz](../README.md#desenvolvimento--opção-1-api-fake-em-memória-recomendado-para-o-frontend) e no seed em [`src/shared/mock/mock-store.ts`](../src/shared/mock/mock-store.ts).

## CI

Todo push/PR roda `npm test` (junto com lint, format:check, typecheck e build) — ver [DEPLOYMENT.md](./DEPLOYMENT.md#cicd).
