const bearerAuth = { bearerAuth: [] as string[] };
const xTokenAuth = { xTokenAuth: [] as string[] };

const idParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  schema: { type: 'integer' },
};

const paginationParams = [
  { name: 'page', in: 'query' as const, schema: { type: 'integer', default: 1 } },
  { name: 'pageSize', in: 'query' as const, schema: { type: 'integer', default: 20 } },
];

function paginatedResponse(itemRef: string) {
  return {
    description: 'Lista paginada.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { $ref: itemRef } },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  };
}

function itemResponse(itemRef: string, description = 'OK') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { success: { type: 'boolean' }, data: { $ref: itemRef } },
        },
      },
    },
  };
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SIVA API',
    version: '0.1.0',
    description:
      'Sistema Inteligente de Vazão de Água — API do backend. Rode com MOCK_MODE=true para consumir esta API inteira em memória, sem depender de MySQL.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Companies' },
    { name: 'Sectors' },
    { name: 'Assets' },
    { name: 'Devices' },
    { name: 'Sensors' },
    { name: 'Readings' },
    { name: 'Maintenances' },
    { name: 'Alerts' },
    { name: 'Dashboard' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      xTokenAuth: { type: 'apiKey', in: 'header', name: 'X-Token' },
    },
    schemas: {
      Company: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nome: { type: 'string' },
          cnpj: { type: 'string', nullable: true },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      Sector: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          empresaId: { type: 'integer' },
          nome: { type: 'string' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      Asset: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          setorId: { type: 'integer' },
          nome: { type: 'string' },
          tag: { type: 'string', nullable: true },
          tipo: { type: 'string', nullable: true },
          criticidade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
          centroCusto: { type: 'string', nullable: true },
          fotoUrl: { type: 'string', nullable: true },
          manualUrl: { type: 'string', nullable: true },
          descricao: { type: 'string', nullable: true },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          setorId: { type: 'integer' },
          espId: { type: 'string' },
          descricao: { type: 'string', nullable: true },
          ultimoContato: { type: 'string', format: 'date-time', nullable: true },
          online: {
            type: 'boolean',
            description: 'Verdadeiro quando houve leitura nos últimos 10 minutos.',
          },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      CreatedDevice: {
        type: 'object',
        description:
          'Resposta de criação. O `token` é devolvido em texto plano uma única vez — ' +
          'o banco guarda apenas o hash SHA-256.',
        properties: {
          id: { type: 'integer' },
          setorId: { type: 'integer' },
          espId: { type: 'string' },
          descricao: { type: 'string', nullable: true },
          ultimoContato: { type: 'string', format: 'date-time', nullable: true },
          online: { type: 'boolean' },
          criadoEm: { type: 'string', format: 'date-time' },
          token: { type: 'string' },
        },
      },
      Sensor: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          ativoId: { type: 'integer' },
          esp32Id: { type: 'integer' },
          sensorId: { type: 'string' },
          tag: { type: 'string', nullable: true },
          descricao: { type: 'string', nullable: true },
          ativoStatus: {
            type: 'boolean',
            description: 'Sensor habilitado no sistema (não confere com a comunicação do ESP32).',
          },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      DashboardOverview: {
        type: 'object',
        properties: {
          periodo: {
            type: 'object',
            properties: {
              inicio: { type: 'string', format: 'date-time' },
              fim: { type: 'string', format: 'date-time' },
            },
          },
          consumoAtual: {
            nullable: true,
            allOf: [
              {
                type: 'object',
                properties: {
                  valor: { type: 'number' },
                  unidade: { type: 'string', enum: ['L/min', 'L'] },
                  atualizadoEm: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            ],
          },
          consumoDiario: {
            nullable: true,
            allOf: [
              {
                type: 'object',
                properties: {
                  valor: { type: 'number' },
                  unidade: { type: 'string', enum: ['L/min', 'L'] },
                  atualizadoEm: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            ],
          },
          sensores: {
            type: 'object',
            properties: {
              ativos: { type: 'integer' },
              total: { type: 'integer' },
              semLeituraNoPeriodo: { type: 'integer' },
            },
          },
          alertas: {
            type: 'object',
            description: 'Sem fonte de dados enquanto o módulo de alertas não existir.',
            properties: {
              disponivel: { type: 'boolean' },
              total: { type: 'integer', nullable: true },
            },
          },
          manutencoes: {
            type: 'object',
            properties: { pendentes: { type: 'integer' }, total: { type: 'integer' } },
          },
          esp32: {
            type: 'object',
            properties: { online: { type: 'integer' }, total: { type: 'integer' } },
          },
          atividades: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                tipo: { type: 'string', enum: ['leitura', 'manutencao', 'dispositivo'] },
                titulo: { type: 'string' },
                descricao: { type: 'string' },
                occurredAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      Reading: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          sensorId: { type: 'integer' },
          vazao: { type: 'number' },
          registradoEm: { type: 'string', format: 'date-time' },
        },
      },
      Maintenance: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          sensorId: { type: 'integer' },
          tipo: { type: 'string', enum: ['preventiva', 'corretiva', 'inspecao'] },
          status: { type: 'string', enum: ['aberto', 'em_andamento', 'concluido'] },
          descricao: { type: 'string', nullable: true },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nome: { type: 'string' },
          email: { type: 'string' },
          tipo: { type: 'string', enum: ['ADMIN', 'GESTOR', 'TECNICO'] },
          especialidade: { type: 'string', enum: ['MECANICO', 'ELETRICISTA'], nullable: true },
          status: { type: 'string', enum: ['ATIVO', 'INATIVO'] },
          empresaId: { type: 'integer', nullable: true },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'senha'],
        properties: { email: { type: 'string' }, senha: { type: 'string' } },
      },
      LoginResponse: {
        type: 'object',
        properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
      },
      IngestReading: {
        type: 'object',
        required: ['esp_id', 'sensor_id', 'vazao'],
        properties: {
          esp_id: { type: 'string', example: 'esp_01' },
          setor: { type: 'string', example: 'producao' },
          sensor_id: { type: 'string', example: 'sensor_01' },
          vazao: { type: 'number', example: 12.5 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Alerts'],
        summary: 'Healthcheck da API',
        responses: { '200': { description: 'API operacional.' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Autentica um usuário do dashboard e retorna um JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: { '200': itemResponse('#/components/schemas/LoginResponse') },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Retorna o usuário autenticado.',
        security: [bearerAuth],
        responses: { '200': itemResponse('#/components/schemas/User') },
      },
    },
    '/companies': {
      get: {
        tags: ['Companies'],
        summary: 'Lista empresas.',
        security: [bearerAuth],
        parameters: paginationParams,
        responses: { '200': paginatedResponse('#/components/schemas/Company') },
      },
      post: {
        tags: ['Companies'],
        summary: 'Cria uma empresa (ADMIN).',
        security: [bearerAuth],
        responses: { '201': itemResponse('#/components/schemas/Company') },
      },
    },
    '/companies/{id}': {
      get: {
        tags: ['Companies'],
        security: [bearerAuth],
        parameters: [idParam],
        responses: { '200': itemResponse('#/components/schemas/Company') },
      },
    },
    '/companies/{id}/details': {
      get: {
        tags: ['Companies'],
        summary:
          'Detalhes agregados da empresa (empresa, funcionários, setores, resumo). Somente ADMIN.',
        security: [bearerAuth],
        parameters: [idParam],
        responses: { '200': { description: 'Detalhes da empresa.' } },
      },
    },
    '/companies/{id}/users': {
      get: {
        tags: ['Companies'],
        summary: 'Funcionários de uma empresa. Somente ADMIN.',
        security: [bearerAuth],
        parameters: [idParam, ...paginationParams],
        responses: { '200': paginatedResponse('#/components/schemas/User') },
      },
    },
    '/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Ativa/inativa um usuário ({status: ATIVO|INATIVO}). Somente ADMIN.',
        security: [bearerAuth],
        parameters: [idParam],
        responses: { '200': itemResponse('#/components/schemas/User') },
      },
    },
    '/dashboard/admin-summary': {
      get: {
        tags: ['Dashboard'],
        summary:
          'Contadores administrativos reais (empresas, funcionários, sensores, ESP32). Somente ADMIN.',
        security: [bearerAuth],
        responses: { '200': { description: 'Resumo administrativo.' } },
      },
    },
    '/dashboard/overview': {
      get: {
        tags: ['Dashboard'],
        summary:
          'Painel operacional: consumo, sensores, manutenções, dispositivos e atividades. ' +
          'Escopado pela empresa do usuário; ADMIN pode filtrar por `empresaId`.',
        security: [bearerAuth],
        parameters: [{ name: 'empresaId', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': itemResponse('#/components/schemas/DashboardOverview') },
      },
    },
    '/sectors': {
      get: {
        tags: ['Sectors'],
        summary: 'Lista setores de uma empresa.',
        security: [bearerAuth],
        parameters: [
          ...paginationParams,
          { name: 'empresaId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': paginatedResponse('#/components/schemas/Sector') },
      },
      post: {
        tags: ['Sectors'],
        summary: 'Cria um setor.',
        security: [bearerAuth],
        responses: { '201': itemResponse('#/components/schemas/Sector') },
      },
    },
    '/assets': {
      get: {
        tags: ['Assets'],
        summary: 'Lista ativos. Escopado pela empresa do usuário autenticado.',
        security: [bearerAuth],
        parameters: [
          ...paginationParams,
          { name: 'setorId', in: 'query', schema: { type: 'integer' } },
          { name: 'empresaId', in: 'query', schema: { type: 'integer' } },
          {
            name: 'criticidade',
            in: 'query',
            schema: { type: 'string', enum: ['baixa', 'media', 'alta'] },
          },
        ],
        responses: { '200': paginatedResponse('#/components/schemas/Asset') },
      },
      post: {
        tags: ['Assets'],
        summary: 'Cria um ativo vinculado a um setor.',
        security: [bearerAuth],
        responses: { '201': itemResponse('#/components/schemas/Asset') },
      },
    },
    '/devices': {
      get: {
        tags: ['Devices'],
        summary: 'Lista dispositivos ESP32. Escopado pela empresa do usuário autenticado.',
        security: [bearerAuth],
        parameters: [
          ...paginationParams,
          { name: 'setorId', in: 'query', schema: { type: 'integer' } },
          { name: 'empresaId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': paginatedResponse('#/components/schemas/Device') },
      },
      post: {
        tags: ['Devices'],
        summary: 'Cadastra um ESP32 e gera seu X-Token (exibido só na criação).',
        security: [bearerAuth],
        responses: { '201': itemResponse('#/components/schemas/CreatedDevice') },
      },
    },
    '/sensors': {
      get: {
        tags: ['Sensors'],
        summary: 'Lista sensores. Escopado pela empresa do usuário autenticado.',
        security: [bearerAuth],
        parameters: [
          ...paginationParams,
          { name: 'esp32Id', in: 'query', schema: { type: 'integer' } },
          { name: 'ativoId', in: 'query', schema: { type: 'integer' } },
          { name: 'empresaId', in: 'query', schema: { type: 'integer' } },
          { name: 'ativoStatus', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': paginatedResponse('#/components/schemas/Sensor') },
      },
      post: {
        tags: ['Sensors'],
        summary: 'Cria um sensor vinculado a um ativo e a um ESP32 do mesmo setor.',
        security: [bearerAuth],
        responses: { '201': itemResponse('#/components/schemas/Sensor') },
      },
    },
    '/readings': {
      get: {
        tags: ['Readings'],
        summary: 'Lista o histórico de vazão de um sensor.',
        security: [bearerAuth],
        parameters: [
          ...paginationParams,
          { name: 'sensorId', in: 'query', required: true, schema: { type: 'integer' } },
        ],
        responses: { '200': paginatedResponse('#/components/schemas/Reading') },
      },
      post: {
        tags: ['Readings'],
        summary: 'Ingestão de leitura enviada pelo firmware do ESP32 (autenticado por X-Token).',
        security: [xTokenAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/IngestReading' } },
          },
        },
        responses: { '201': itemResponse('#/components/schemas/Reading') },
      },
    },
    '/maintenances': {
      get: {
        tags: ['Maintenances'],
        summary: 'Lista chamados de manutenção de um sensor.',
        security: [bearerAuth],
        parameters: [
          ...paginationParams,
          { name: 'sensorId', in: 'query', required: true, schema: { type: 'integer' } },
        ],
        responses: { '200': paginatedResponse('#/components/schemas/Maintenance') },
      },
      post: {
        tags: ['Maintenances'],
        summary: 'Abre um chamado de manutenção.',
        security: [bearerAuth],
        responses: { '201': itemResponse('#/components/schemas/Maintenance') },
      },
    },
    '/alerts': {
      get: {
        tags: ['Alerts'],
        summary: 'Lista alertas de vazamento/consumo anômalo (não implementado nesta etapa).',
        security: [bearerAuth],
        responses: {
          '501': { description: 'Ainda não implementado — ver "Próximas etapas" no README.' },
        },
      },
    },
  },
};
