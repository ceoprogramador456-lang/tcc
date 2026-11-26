import type { ListOptions, ListResult } from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { devices, readings as readingsMock, sectors } from '../../../shared/mock/mock-store.js';
import { NotFoundError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import type { AuthenticatedDevice } from '../../../types/express.js';
import { isDeviceOnline } from '../../devices/entities/device.entity.js';
import type { Reading } from '../entities/reading.entity.js';
import type { CreateReadingDTO } from '../dtos/reading.dtos.js';

export interface ReadingRepository {
  list(options?: ListOptions): Promise<ListResult<Reading>>;
  ingest(
    device: AuthenticatedDevice,
    data: CreateReadingDTO,
  ): Promise<{
    reading: Reading;
    contact: Date;
    empresaId: number;
    setorId: number;
    wasOnline: boolean;
  }>;
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
  async ingest(device, data) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.esp32.findUnique({
        where: { id: device.id },
        select: {
          ultimoContato: true,
          revokedAt: true,
          setorId: true,
          setor: { select: { empresaId: true } },
        },
      });
      if (!current) throw new UnauthorizedError('X-Token inválido.');
      const contact = new Date();
      const updated = await tx.esp32.updateMany({
        where: { id: device.id, tokenHash: device.tokenHash, revokedAt: null },
        data: { ultimoContato: contact },
      });
      if (updated.count !== 1) throw new UnauthorizedError('X-Token inválido.');
      const reading = mapLeitura(await tx.leitura.create({ data }));
      return {
        reading,
        contact,
        empresaId: current.setor.empresaId,
        setorId: current.setorId,
        wasOnline: isDeviceOnline(current, contact),
      };
    });
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
  async ingest(device, data) {
    const current = devices.findById(device.id);
    if (!current || current.revokedAt || current.tokenHash !== device.tokenHash) {
      throw new UnauthorizedError('X-Token inválido.');
    }
    const sector = sectors.findById(current.setorId);
    if (!sector) throw new NotFoundError('Setor');
    const contact = new Date();
    const wasOnline = isDeviceOnline(current, contact);
    const reading = readingsMock.create({ ...data, registradoEm: contact });
    devices.update(device.id, { ultimoContato: contact });
    return { reading, contact, empresaId: sector.empresaId, setorId: current.setorId, wasOnline };
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
