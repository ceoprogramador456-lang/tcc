import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { sensors as sensorsMock } from '../../../shared/mock/mock-store.js';
import type { Sensor } from '../entities/sensor.entity.js';
import type { CreateSensorDTO, UpdateSensorDTO } from '../dtos/sensor.dtos.js';
import { normalizeIdFilter } from '../../../utils/id-filter.js';

export type SensorRepository = CrudRepository<Sensor, CreateSensorDTO, UpdateSensorDTO> & {
  findByDeviceAndSensorId(esp32Id: number, sensorId: string): Promise<Sensor | null>;
};

function buildWhere(filter: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (filter.id !== undefined) where.id = normalizeIdFilter(filter.id);
  if (filter.esp32Id !== undefined) where.esp32Id = normalizeIdFilter(filter.esp32Id);
  if (filter.ativoId !== undefined) where.ativoId = normalizeIdFilter(filter.ativoId);
  if (filter.tag !== undefined) where.tag = filter.tag;
  if (filter.ativoStatus !== undefined) where.ativoStatus = filter.ativoStatus;
  return where;
}

const prismaRepository: SensorRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<Sensor>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.sensor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.sensor.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.sensor.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.sensor.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.sensor.update({ where: { id: Number(id) }, data });
    } catch {
      return null;
    }
  },
  async remove(id) {
    try {
      await prisma.sensor.delete({ where: { id: Number(id) } });
      return true;
    } catch {
      return false;
    }
  },
  async findByDeviceAndSensorId(esp32Id, sensorId) {
    return prisma.sensor.findFirst({ where: { esp32Id, sensorId } });
  },
};

const mockRepository: SensorRepository = {
  ...createMockRepository<Sensor, CreateSensorDTO, UpdateSensorDTO>(sensorsMock, {
    defaults: () => ({ criadoEm: new Date() }),
  }),
  async findByDeviceAndSensorId(esp32Id, sensorId) {
    return sensorsMock.findOne((item) => item.esp32Id === esp32Id && item.sensorId === sensorId);
  },
};

export function createSensorRepository(): SensorRepository {
  return env.MOCK_MODE ? mockRepository : prismaRepository;
}
