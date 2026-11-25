import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { ordensServico as ordensServicoMock } from '../../../shared/mock/mock-store.js';
import type { OrdemServico } from '../entities/ordemServico.entity.js';
import type {
  OrdemServicoCreationInput,
  UpdateOrdemServicoDTO,
} from '../dtos/ordemServico.dtos.js';

export type OrdemServicoRepository = CrudRepository<
  OrdemServico,
  OrdemServicoCreationInput,
  UpdateOrdemServicoDTO
>;

function buildWhere(filter: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (filter.id !== undefined) where.id = Number(filter.id);
  if (filter.empresaId !== undefined) where.empresaId = Number(filter.empresaId);
  if (filter.solicitanteId !== undefined) where.solicitanteId = Number(filter.solicitanteId);
  if (filter.status !== undefined) where.status = filter.status;
  return where;
}

const prismaRepository: OrdemServicoRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<OrdemServico>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.ordemServico.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.ordemServico.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.ordemServico.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.ordemServico.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.ordemServico.update({
        where: { id: Number(id) },
        data: { ...data, atualizadoEm: new Date() },
      });
    } catch {
      return null;
    }
  },
  async remove(id) {
    try {
      await prisma.ordemServico.delete({ where: { id: Number(id) } });
      return true;
    } catch {
      return false;
    }
  },
};

export function createOrdemServicoRepository(): OrdemServicoRepository {
  return env.MOCK_MODE
    ? createMockRepository(ordensServicoMock, {
        defaults: () => ({ status: 'aberto', criadoEm: new Date(), atualizadoEm: new Date() }),
      })
    : prismaRepository;
}
