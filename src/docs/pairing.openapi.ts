const macAddress = { type: 'string', example: 'A4:CF:12:34:56:78' };
const code = {
  type: 'string',
  example: 'AB12-CD34',
  description: '8 caracteres hexadecimais do OLED; hífen e espaços são opcionais.',
};
const expiresAt = { type: 'string', format: 'date-time' };
const identity = {
  type: 'object',
  required: ['macAddress'],
  properties: { macAddress },
  additionalProperties: false,
};
const boardAuth = [{ pairingKeyAuth: [] as string[] }];
const userAuth = [{ bearerAuth: [] as string[] }];
const body = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const response = (description: string, data: object) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: { success: { type: 'boolean', enum: [true] }, data },
      },
    },
  },
});
const errors = {
  '401': { description: 'Credencial ausente ou inválida.' },
  '403': { description: 'Papel ou empresa sem permissão.' },
  '404': { description: 'Código inexistente, expirado ou já utilizado.' },
  '409': {
    description: 'Placa já pareada, aprovação concorrente ou equipamento/setor incompatível.',
  },
  '422': { description: 'Payload inválido.' },
  '429': { description: 'Limite por IP excedido; respeite Retry-After.' },
};

export const pairingPaths = {
  '/device-pairings/request': {
    post: {
      tags: ['Pairing'],
      summary: 'A placa solicita pareamento (6/min por IP).',
      security: boardAuth,
      description:
        'Chave de 256 bits persistida antes da chamada. Repetir a mesma chave recupera a solicitação ainda válida. Código expira em 10 minutos; MAC não é autenticação.',
      requestBody: body({
        ...identity,
        properties: {
          macAddress,
          sensorId: { type: 'string', default: 'flow_01', pattern: '^[a-zA-Z0-9_-]{1,50}$' },
        },
      }),
      responses: {
        ...errors,
        '201': response('Código para exibir no OLED.', {
          type: 'object',
          properties: {
            code,
            expiresAt,
            status: { type: 'string', enum: ['PENDING', 'APPROVED'] },
            pollIntervalMs: { type: 'integer', example: 5000 },
          },
        }),
      },
    },
  },
  '/device-pairings/status': {
    post: {
      tags: ['Pairing'],
      summary: 'A placa consulta aprovação (30/min por IP).',
      security: boardAuth,
      description:
        'Somente MAC + chave privada da solicitação recebem a credencial. Entrega repetível por até 10 minutos após aprovação, até acknowledge. Salvar na NVS antes de confirmar.',
      requestBody: body(identity),
      responses: {
        ...errors,
        '200': response('Estado e, somente se aprovado, credencial da placa.', {
          oneOf: [
            {
              type: 'object',
              required: ['status'],
              properties: { status: { type: 'string', enum: ['PENDING', 'DELIVERED'] } },
            },
            {
              type: 'object',
              required: ['status', 'token', 'espId', 'sensorId'],
              properties: {
                status: { type: 'string', enum: ['APPROVED'] },
                token: { type: 'string' },
                espId: { type: 'string' },
                sensorId: { type: 'string' },
              },
            },
          ],
        }),
      },
    },
  },
  '/device-pairings/acknowledge': {
    post: {
      tags: ['Pairing'],
      summary: 'Confirma gravação da credencial na placa (10/min por IP).',
      security: boardAuth,
      requestBody: body(identity),
      responses: {
        ...errors,
        '204': {
          description:
            'Entrega encerrada. Repetição é idempotente durante a validade da solicitação.',
        },
      },
    },
  },
  '/device-pairings/lookup': {
    post: {
      tags: ['Pairing'],
      summary: 'ADMIN/GESTOR encontra a placa pelo código físico.',
      security: userAuth,
      description:
        'Não lista placas não vinculadas. Para novo pareamento, respeita a empresa do dispositivo. Lookup e approve compartilham 10 chamadas/min por IP.',
      requestBody: body({
        type: 'object',
        required: ['code'],
        properties: { code },
        additionalProperties: false,
      }),
      responses: {
        ...errors,
        '200': response('Identidade sem chave ou token.', {
          type: 'object',
          properties: {
            macAddress,
            sensorId: { type: 'string' },
            expiresAt,
            existingDeviceId: { type: 'integer', nullable: true },
          },
        }),
      },
    },
  },
  '/device-pairings/approve': {
    post: {
      tags: ['Pairing'],
      summary: 'ADMIN/GESTOR aprova e vincula placa e sensor ao equipamento.',
      security: userAuth,
      description:
        'Transação atômica; valida empresa e herda o setor do equipamento. Novo pareamento preserva dispositivo, sensor e histórico existentes. Não entrega token ao navegador.',
      requestBody: body({
        type: 'object',
        required: ['code', 'ativoId'],
        additionalProperties: false,
        properties: {
          code,
          ativoId: { type: 'integer', minimum: 1 },
          descricao: { type: 'string', maxLength: 100 },
        },
      }),
      responses: {
        ...errors,
        '201': response('Placa e sensor vinculados.', {
          type: 'object',
          properties: {
            device: { $ref: '#/components/schemas/Device' },
            sensor: { $ref: '#/components/schemas/Sensor' },
          },
        }),
      },
    },
  },
  '/device-pairings/devices/{id}/reset': {
    post: {
      tags: ['Pairing'],
      summary: 'ADMIN/GESTOR revoga credencial e permite novo pareamento (5/min por IP).',
      security: userAuth,
      description:
        'Preserva histórico. Ao receber 401 na próxima leitura, o firmware remove a credencial e solicita um novo código. Apenas placas com MAC cadastrado.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      ],
      responses: {
        ...errors,
        '204': { description: 'Token anterior revogado; próximo pareamento autorizado.' },
      },
    },
  },
};
