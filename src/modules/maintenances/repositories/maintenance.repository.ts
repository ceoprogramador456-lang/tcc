import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { maintenances as maintenancesMock } from '../../../shared/mock/mock-store.js';
import type { Maintenance } from '../entities/maintenance.entity.js';
import type { CreateMaintenanceDTO, UpdateMaintenanceDTO } from '../dtos/maintenance.dtos.js';
import { normalizeIdFilter, normalizeListFilter } from '../../../utils/id-filter.js';

export type MaintenanceRepository = CrudRepository<
  Maintenance,
  CreateMaintenanceDTO,
  UpdateMaintenanceDTO
>;

function buildWhere(filter: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (filter.id !== undefined) where.id = Number(filter.id);
  if (filter.sensorId !== undefined) where.sensorId = normalizeIdFilter(filter.sensorId);
  if (filter.status !== undefined) where.status = normalizeListFilter(filter.status);
  if (filter.tipo !== undefined) where.tipo = filter.tipo;
  return where;
}

const prismaRepository: MaintenanceRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<Maintenance>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.manutencao.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { abertoEm: 'desc' },
      }),
      prisma.manutencao.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.manutencao.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.manutencao.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.manutencao.update({
        where: { id: Number(id) },
        data: {
          ...data,
          concluidoEm: data.status === 'concluido' ? new Date() : undefined,
        },
      });
    } catch {
      return null;
    }
  },
  async remove(id) {
    try {
      await prisma.manutencao.delete({ where: { id: Number(id) } });
      return true;
    } catch {
      return false;
    }
  },
};

export function createMaintenanceRepository(): MaintenanceRepository {
  return env.MOCK_MODE
    ? createMockRepository(maintenancesMock, {
        defaults: () => ({ status: 'aberto', abertoEm: new Date(), concluidoEm: null }),
      })
    : prismaRepository;
}
