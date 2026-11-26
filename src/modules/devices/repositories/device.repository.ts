import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { devices as devicesMock, sensors as sensorsMock } from '../../../shared/mock/mock-store.js';
import { isPrismaError } from '../../../shared/errors/prisma-errors.js';
import { ConflictError } from '../../../shared/errors/app-error.js';
import type { Device } from '../entities/device.entity.js';
import type { CreateDeviceDTO, UpdateDeviceDTO } from '../dtos/device.dtos.js';

/** Token já com hash — o service gera o token em claro e calcula o hash. */
export type CreateDeviceInput = CreateDeviceDTO & { tokenHash: string };

export type DeviceRepository = CrudRepository<Device, CreateDeviceInput, UpdateDeviceDTO> & {
  findByTokenHash(tokenHash: string): Promise<Device | null>;
};

function buildWhere(filter: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (filter.espId !== undefined) where.espId = String(filter.espId);
  if (filter.id !== undefined) where.id = Number(filter.id);
  if (filter.setorId !== undefined) where.setorId = normalizeIdFilter(filter.setorId);
  if (filter.setorIds !== undefined) where.setorId = normalizeIdFilter(filter.setorIds);
  return where;
}

/** Aceita `12`, `[1,2]` ou `{ in: [1,2] }` — mesmo contrato para Prisma e mock. */
function normalizeIdFilter(value: unknown): number | { in: number[] } {
  if (Array.isArray(value)) return { in: value.map(Number) };
  if (value && typeof value === 'object' && 'in' in value) {
    return { in: (value as { in: unknown[] }).in.map(Number) };
  }
  return Number(value);
}

const prismaRepository: DeviceRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<Device>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.esp32.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.esp32.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.esp32.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.esp32.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.esp32.update({ where: { id: Number(id) }, data });
    } catch {
      return null;
    }
  },
  async remove(id) {
    try {
      await prisma.esp32.delete({ where: { id: Number(id) } });
      return true;
    } catch (error) {
      if (isPrismaError(error, 'P2025')) return false;
      throw error;
    }
  },
  async findByTokenHash(tokenHash) {
    return prisma.esp32.findUnique({ where: { tokenHash } });
  },
};

const mockRepository: DeviceRepository = {
  ...createMockRepository<Device, CreateDeviceInput, UpdateDeviceDTO>(devicesMock),
  async remove(id) {
    if (sensorsMock.findOne((sensor) => sensor.esp32Id === Number(id))) {
      throw new ConflictError('O dispositivo possui sensores vinculados.');
    }
    return devicesMock.remove(Number(id));
  },
  async create(data) {
    return devicesMock.create({
      ...data,
      descricao: data.descricao ?? null,
      ultimoContato: null,
      criadoEm: new Date(),
    });
  },
  async findByTokenHash(tokenHash) {
    return devicesMock.findOne((item) => item.tokenHash === tokenHash);
  },
};

export function createDeviceRepository(): DeviceRepository {
  return env.MOCK_MODE ? mockRepository : prismaRepository;
}

/** Busca o dispositivo pelo hash do token apresentado no header `X-Token`. */
export async function findDeviceByTokenHash(tokenHash: string): Promise<Device | null> {
  return createDeviceRepository().findByTokenHash(tokenHash);
}
