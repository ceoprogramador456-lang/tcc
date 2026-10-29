import type { ListOptions, ListResult } from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { readings as readingsMock } from '../../../shared/mock/mock-store.js';
import type { Reading } from '../entities/reading.entity.js';
import type { CreateReadingDTO } from '../dtos/reading.dtos.js';

export interface ReadingRepository {
  list(options?: ListOptions): Promise<ListResult<Reading>>;
  create(data: CreateReadingDTO): Promise<Reading>;
  /**
   * Leituras dos sensores informados dentro do período, mais recentes primeiro.
   *
   * Usado pelo dashboard para consumir/ integrate as vazões sem carregar o
   * histórico completo. O limite evita respostas ilimitadas em ambientes com
   * alta frequência de leitura.
   */
  listBySensorsSince(sensorIds: number[], since: Date, limit: number): Promise<Reading[]>;
}

const prismaRepository: ReadingRepository = {
  async list(options: ListOptions = {}) {
    const { page = 1, pageSize = 50, filter = {} } = options;
    const where = filter.sensorId !== undefined ? { sensorId: Number(filter.sensorId) } : {};
    const [rows, total] = await Promise.all([
      prisma.leitura.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { registradoEm: 'desc' },
      }),
      prisma.leitura.count({ where }),
    ]);
    return { items: rows.map(mapLeitura), total };
  },
  async create(data) {
    const row = await prisma.leitura.create({ data });
    return mapLeitura(row);
  },
  async listBySensorsSince(sensorIds, since, limit) {
    if (sensorIds.length === 0) return [];
    const rows = await prisma.leitura.findMany({
      where: { sensorId: { in: sensorIds }, registradoEm: { gte: since } },
      orderBy: { registradoEm: 'desc' },
      take: limit,
    });
    return rows.map(mapLeitura);
  },
};

function mapLeitura(row: {
  id: bigint;
  sensorId: number;
  vazao: number;
  registradoEm: Date;
}): Reading {
  return {
    id: Number(row.id),
    sensorId: row.sensorId,
    vazao: row.vazao,
    registradoEm: row.registradoEm,
  };
}

const mockRepository: ReadingRepository = {
  async list(options: ListOptions = {}) {
    const { page = 1, pageSize = 50, filter = {} } = options;
    const all = readingsMock
      .list((item) =>
        filter.sensorId !== undefined ? item.sensorId === Number(filter.sensorId) : true,
      )
      .sort((a, b) => b.registradoEm.getTime() - a.registradoEm.getTime());
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total: all.length };
  },
  async create(data) {
    return readingsMock.create({ ...data, registradoEm: new Date() });
  },
  async listBySensorsSince(sensorIds, since, limit) {
    if (sensorIds.length === 0) return [];
    const allowed = new Set(sensorIds.map(Number));
    return readingsMock
      .list((item) => allowed.has(item.sensorId) && item.registradoEm.getTime() >= since.getTime())
      .sort((a, b) => b.registradoEm.getTime() - a.registradoEm.getTime())
      .slice(0, limit);
  },
};

export function createReadingRepository(): ReadingRepository {
  return env.MOCK_MODE ? mockRepository : prismaRepository;
}
