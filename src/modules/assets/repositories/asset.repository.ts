import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { assets as assetsMock } from '../../../shared/mock/mock-store.js';
import type { Asset } from '../entities/asset.entity.js';
import type { CreateAssetDTO, UpdateAssetDTO } from '../dtos/asset.dtos.js';
import { normalizeIdFilter } from '../../../utils/id-filter.js';

export type AssetRepository = CrudRepository<Asset, CreateAssetDTO, UpdateAssetDTO>;

function buildWhere(filter: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (filter.id !== undefined) where.id = normalizeIdFilter(filter.id);
  if (filter.setorId !== undefined) where.setorId = normalizeIdFilter(filter.setorId);
  if (filter.criticidade !== undefined) where.criticidade = filter.criticidade;
  if (filter.tag !== undefined) where.tag = filter.tag;
  return where;
}

const prismaRepository: AssetRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<Asset>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.ativo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.ativo.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.ativo.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.ativo.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.ativo.update({ where: { id: Number(id) }, data });
    } catch {
      return null;
    }
  },
  async remove(id) {
    try {
      await prisma.ativo.delete({ where: { id: Number(id) } });
      return true;
    } catch {
      return false;
    }
  },
};

const mockRepository: AssetRepository = {
  ...createMockRepository<Asset, CreateAssetDTO, UpdateAssetDTO>(assetsMock, {
    defaults: () => ({ criadoEm: new Date() }),
  }),
};

export function createAssetRepository(): AssetRepository {
  return env.MOCK_MODE ? mockRepository : prismaRepository;
}
