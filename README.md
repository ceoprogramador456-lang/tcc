# 💧 SIVA — Sistema Inteligente de Vazão de Água

Sistema de monitoramento e controle de vazão de água em tempo real, voltado para ambientes industriais, utilizando IoT para coletar, transmitir e analisar dados de consumo hídrico por setor/equipamento.

Projeto de Trabalho de Conclusão de Curso (TCC) — **ETEC Dr. Nelson Alves Vianna**, Médio Técnico em Desenvolvimento de Sistemas (Período Integral).

📚 **Documentação completa:** [docs/README.md](docs/README.md) (arquitetura, banco de dados, fluxos de negócio, API, autenticação, segurança, testes, deploy, runbook, ADRs).

## 🎯 Sobre o projeto

A gestão hídrica tradicional em indústrias depende de leituras manuais e periódicas, o que atrasa a detecção de vazamentos e contribui para altos índices de desperdício de água tratada.

O SIVA propõe uma central de vazão com sensores instalados em diferentes pontos da rede hidráulica, enviando dados em tempo real para um sistema central que permite:

- Visualizar o consumo por setor ou equipamento (resfriamento, produção, limpeza etc.)
- Identificar padrões de consumo
- Detectar vazamentos e desperdícios rapidamente
- Apoiar decisões mais eficientes na gestão de recursos hídricos

O projeto está alinhado aos seguintes Objetivos de Desenvolvimento Sustentável (ODS):

- Indústria, Inovação e Infraestrutura
- Cidades e Comunidades Sustentáveis
- Consumo e Produção Responsáveis
- Combate às Alterações Climáticas

## 🏗️ Arquitetura

```
[Sensor de Fluxo YF-S201] → [ESP32] → [API Node.js/Express] → [MySQL] → [Dashboard Web]
                                ↑
                        [Display OLED SSD1306]
```

Hierarquia dos dados: **Empresa → Setor → Ativo/ESP32 → Sensor → Leitura**

O backend segue organização feature-modular (`src/modules/<recurso>/{controllers,services,repositories,routes,entities,dtos,validators}`) com camadas HTTP → Controller → Service → Repository → Database, permitindo trocar a camada de persistência (MySQL via Prisma, ou 100% em memória) sem tocar em regra de negócio. Detalhes completos, com diagramas, em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## ⚙️ Tecnologias

**Firmware (ESP32)**
- C/C++ (Arduino)
- Estrutura modular: `main.ino`, `config.h`, `sensor.h`, `display.h`, `wifi_manager.h`

**Backend**
- Node.js 22+, TypeScript, ESM
- Express 5 + Zod (validação) + Prisma (MySQL)
- Autenticação de usuários via JWT e de dispositivos ESP32 via `X-Token` — ver [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)
- Documentação OpenAPI/Swagger servida em `/docs` em runtime
- Modo mock em memória (`MOCK_MODE=true`) para desenvolver sem depender de MySQL
- Pino (logs estruturados), Helmet, CORS, rate limit, compression
- Vitest + Supertest (testes), ESLint + Prettier + Husky + lint-staged (qualidade)

**Hardware**
- Microcontrolador ESP32
- Sensor de vazão YF-S201
- Display OLED SSD1306

**Dashboard**
- Interface web com atualização em tempo real (`fetch` / `setInterval`)

## 📦 Payload de dados

Cada sensor envia um JSON identificando sua origem na hierarquia do sistema (autenticado pelo header `X-Token`, ver [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)):

```json
{
  "esp_id": "esp_01",
  "setor": "producao",
  "sensor_id": "sensor_01",
  "vazao": 0.0
}
```

## 👥 Autores

- João Henrique Da Silva Gonçalves
- Natanael Oliveira
- Rafael Pereira

## ✅ Pré-requisitos

- [Node.js 22+](https://nodejs.org/) (veja [.nvmrc](.nvmrc))
- npm (vem com o Node)
- MySQL 8+ — **opcional**: só é necessário se você não for usar `MOCK_MODE=true`
- Docker + Docker Compose — opcional, só para a opção de execução via container

## 📥 Como instalar

```bash
git clone <url-do-repositorio>
cd Siva
npm install
```

## 🚀 Como executar

### Desenvolvimento — Opção 1: API fake em memória (recomendado para o frontend)

Não precisa de MySQL nem de `prisma migrate`. Sobe com dados de exemplo já
populados (empresas, setores, ESP32s, sensores e leituras).

```bash
npm run dev:mock
```

A API sobe em `http://localhost:3000` com hot-reload. Usuários de teste (senha `senha123`
para todos): `super@siva.com` (super_admin), `carla.mendes@aquaplas.com`
(admin_empresa), `diego.ramos@aquaplas.com` (funcionario).

### Desenvolvimento — Opção 2: com MySQL de verdade

```bash
cp .env.example .env        # ajuste DATABASE_URL/JWT_SECRET se necessário
npm run prisma:migrate      # cria as tabelas a partir de prisma/schema.prisma
npm run seed                # exige senhas SEED_* distintas no .env; popula os usuários de exemplo
npm run dev
```

### Desenvolvimento — Opção 3: Docker Compose (API + MySQL)

```bash
docker compose up --build
```

### Produção

```bash
npm run build
npm start                   # ou: npm run start:mock, para subir em memória
```

Para deploy em servidor (Docker multi-stage + Caddy) e o pipeline de CI, veja [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Para o que fazer quando algo dá errado em produção, veja [docs/RUNBOOK.md](docs/RUNBOOK.md).

### Documentação interativa da API

Com o servidor rodando, a documentação (Swagger UI) fica em
`http://localhost:3000/docs`, e o JSON do OpenAPI em `/docs/openapi.json`. Um guia com exemplos de request/response está em [docs/API.md](docs/API.md).

### Simulando um ESP32

Para testar o endpoint de ingestão de leituras (`POST /api/readings`,
autenticado por `X-Token`) sem hardware:

```bash
npm run simulate:esp32
```

```bash
# Firmware
# Abrir main.ino na Arduino IDE, configurar Wi-Fi em wifi_manager.h e fazer upload para o ESP32
```

## 📜 Scripts disponíveis

| Script | Descrição |
| --- | --- |
| `npm run dev` / `npm run dev:mock` | sobe a API com hot-reload (contra MySQL / em memória) |
| `npm run build` / `npm start` / `npm run start:mock` | build de produção e execução do build (contra MySQL / em memória) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run typecheck` | checagem de tipos sem emitir arquivos |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | testes com Vitest (ver [docs/TESTING.md](docs/TESTING.md)) |
| `npm run prisma:generate` | gera o Prisma Client a partir do schema |
| `npm run prisma:migrate` / `npm run prisma:deploy` | cria migração local / aplica migrações existentes (produção) |
| `npm run prisma:studio` | explorador visual do banco |
| `npm run seed` | popula o banco com dados de exemplo |
| `npm run simulate:esp32` | simula um ESP32 enviando leituras via `X-Token` |

## 📁 Estrutura de pastas

```
src/
├── app.ts, server.ts     # bootstrap do Express e do processo HTTP
├── config/                # leitura e validação de variáveis de ambiente (Zod)
├── database/              # cliente Prisma
├── docs/                  # documento OpenAPI + rota do Swagger UI (/docs)
├── middlewares/            # auth, validação, error handler, logger, 404
├── modules/<recurso>/      # um módulo por recurso de domínio (ver abaixo)
├── routes/                 # agrega as rotas de todos os módulos em /api
├── shared/                 # erros, resposta HTTP padronizada, mock store genérico
├── types/                  # augmentations do Express (req.user, req.device, req.log)
├── utils/                  # logger, asyncHandler, serialização de BigInt
├── interfaces/             # contratos (ex: CrudRepository) compartilhados entre módulos
└── jobs/                   # reservado para tarefas agendadas (nenhuma implementada ainda)
```

Cada pasta em `src/modules/` (`auth`, `users`, `companies`, `sectors`, `assets`, `devices`, `sensors`, `readings`, `maintenances`, `alerts`) segue o mesmo padrão interno — detalhe completo, com o papel de cada subpasta, em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🔐 Variáveis de ambiente

Veja o arquivo [.env.example](.env.example) para os valores padrão. Referência completa, com o efeito de cada variável, em [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#variáveis-de-ambiente).

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NODE_ENV` | não (default `development`) | `development` \| `test` \| `production` |
| `PORT` | não (default `3000`) | porta HTTP da API |
| `MOCK_MODE` | não (default `false`) | `true` roda a API 100% em memória, sem MySQL |
| `DATABASE_URL` | sim, se `MOCK_MODE=false` | connection string do MySQL usada pelo Prisma |
| `JWT_SECRET` | **sim, em produção** | segredo de assinatura dos JWTs — nunca use o valor padrão do `.env.example` em produção |
| `JWT_EXPIRES_IN` | não (default `8h`) | validade do token de login |
| `CORS_ORIGIN` | não (default `*`) | origem(ns) permitida(s), separadas por vírgula |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | não | janela e limite do rate limit global |
| `LOG_LEVEL` | não (default `info`) | nível de log do Pino |

## 🤝 Como contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o fluxo de branches/PR e [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) para convenções de código, como criar um módulo novo e como criar uma migration.

## 📄 Licença

Projeto acadêmico desenvolvido para fins de TCC.

Repositorio do TCC: https://github.com/ceoprogramador456-lang/tcc
