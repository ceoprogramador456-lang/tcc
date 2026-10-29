import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { sectors as sectorsMock } from '../../../shared/mock/mock-store.js';
import type { Sector } from '../entities/sector.entity.js';
import type { CreateSectorDTO, UpdateSectorDTO } from '../dtos/sector.dtos.js';

export type SectorRepository = CrudRepository<Sector, CreateSectorDTO, UpdateSectorDTO>;

function buildWhere(filter: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (filter.id !== undefined) where.id = Number(filter.id);
  if (filter.empresaId !== undefined) where.empresaId = Number(filter.empresaId);
  return where;
}

const prismaRepository: SectorRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<Sector>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.setor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.setor.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.setor.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.setor.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.setor.update({ where: { id: Number(id) }, data });
    } catch {
      return null;
    }
  },
  async remove(id) {
    try {
      await prisma.setor.delete({ where: { id: Number(id) } });
      return true;
    } catch {
      return false;
    }
  },
};

export function createSectorRepository(): SectorRepository {
  return env.MOCK_MODE
    ? createMockRepository(sectorsMock, { defaults: () => ({ criadoEm: new Date() }) })
    : prismaRepository;
}
