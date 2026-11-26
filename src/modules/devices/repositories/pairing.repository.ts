import type { PairingSession, Prisma } from '@prisma/client';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { AppError, ConflictError } from '../../../shared/errors/app-error.js';
import { isPrismaError } from '../../../shared/errors/prisma-errors.js';
import * as mock from '../../../shared/mock/mock-store.js';
import type { Device } from '../entities/device.entity.js';

type NewDevice = Pick<
  Device,
  'mac' | 'espId' | 'tokenHash' | 'setorId' | 'descricao' | 'firmwareVersion' | 'model'
>;
type DevicePatch = Partial<
  Pick<
    Device,
    'revokedAt' | 'tokenHash' | 'descricao' | 'firmwareVersion' | 'model' | 'ultimoContato'
  >
>;

interface PairingStore {
  company(id: number): Promise<{ id: number } | null>;
  sector(id: number): Promise<{ empresaId: number } | null>;
  asset(id: number): Promise<{ setorId: number } | null>;
  assetByName(setorId: number, nome: string): Promise<{ id: number } | null>;
  addAsset(setorId: number, nome: string): Promise<{ id: number }>;
  session(id: string): Promise<PairingSession | null>;
  sessionByMac(mac: string): Promise<PairingSession | null>;
  pending(empresaId?: number): Promise<PairingSession[]>;
  replaceSession(session: PairingSession): Promise<void>;
  updateSession(
    id: string,
    patch: Partial<Pick<PairingSession, 'state' | 'attempts' | 'expiresAt'>>,
  ): Promise<void>;
  deviceByMac(mac: string): Promise<Device | null>;
  deviceById(id: number): Promise<Device | null>;
  deviceByEspId(espId: string): Promise<Device | null>;
  sensor(esp32Id: number, sensorId: string): Promise<{ ativoId: number } | null>;
  addDevice(data: NewDevice): Promise<Device>;
  updateDevice(id: number, data: DevicePatch): Promise<Device>;
  addSensor(esp32Id: number, sensorId: string, ativoId: number): Promise<void>;
}

function databaseStore(db: Prisma.TransactionClient): PairingStore {
  return {
    company: (id) => db.empresa.findUnique({ where: { id }, select: { id: true } }),
    sector: (id) => db.setor.findUnique({ where: { id }, select: { empresaId: true } }),
    asset: (id) => db.ativo.findUnique({ where: { id }, select: { setorId: true } }),
    assetByName: (setorId, nome) =>
      db.ativo.findFirst({ where: { setorId, nome }, select: { id: true } }),
    addAsset: (setorId, nome) => db.ativo.create({ data: { setorId, nome }, select: { id: true } }),
    session: (id) => db.pairingSession.findUnique({ where: { id } }),
    sessionByMac: (mac) => db.pairingSession.findUnique({ where: { mac } }),
    pending: (empresaId) =>
      db.pairingSession.findMany({
        where: { empresaId, state: 'pending', expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: 'asc' },
      }),
    async replaceSession(session) {
      await db.pairingSession.upsert({
        where: { mac: session.mac },
        create: session,
        update: session,
      });
    },
    async updateSession(id, data) {
      await db.pairingSession.update({ where: { id }, data });
    },
    deviceByMac: (mac) => db.esp32.findUnique({ where: { mac } }),
    deviceById: (id) => db.esp32.findUnique({ where: { id } }),
    deviceByEspId: (espId) => db.esp32.findUnique({ where: { espId } }),
    sensor: (esp32Id, sensorId) =>
      db.sensor.findUnique({
        where: { esp32Id_sensorId: { esp32Id, sensorId } },
        select: { ativoId: true },
      }),
    addDevice: (data) => db.esp32.create({ data }),
    updateDevice: (id, data) => db.esp32.update({ where: { id }, data }),
    async addSensor(esp32Id, sensorId, ativoId) {
      await db.sensor.create({ data: { esp32Id, sensorId, ativoId } });
    },
  };
}

const sessions = new Map<string, PairingSession>();
function assetNameKey(name: string) {
  return name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const mockStore: PairingStore = {
  async company(id) {
    return mock.companies.findById(id);
  },
  async sector(id) {
    return mock.sectors.findById(id);
  },
  async asset(id) {
    return mock.assets.findById(id);
  },
  async assetByName(setorId, nome) {
    const key = assetNameKey(nome);
    return mock.assets.findOne(
      (asset) => asset.setorId === setorId && assetNameKey(asset.nome) === key,
    );
  },
  async addAsset(setorId, nome) {
    return mock.assets.create({
      setorId,
      nome,
      tag: null,
      tipo: null,
      criticidade: 'media',
      centroCusto: null,
      fotoUrl: null,
      manualUrl: null,
      descricao: null,
      criadoEm: new Date(),
    });
  },
  async session(id) {
    return sessions.get(id) ?? null;
  },
  async sessionByMac(mac) {
    return [...sessions.values()].find((s) => s.mac === mac) ?? null;
  },
  async pending(empresaId) {
    return [...sessions.values()].filter(
      (s) =>
        s.state === 'pending' &&
        s.expiresAt > new Date() &&
        (empresaId === undefined || s.empresaId === empresaId),
    );
  },
  async replaceSession(session) {
    for (const row of sessions.values()) if (row.mac === session.mac) sessions.delete(row.id);
    sessions.set(session.id, session);
  },
  async updateSession(id, patch) {
    Object.assign(sessions.get(id)!, patch);
  },
  async deviceByMac(mac) {
    return mock.devices.findOne((d) => d.mac === mac);
  },
  async deviceById(id) {
    return mock.devices.findById(id);
  },
  async deviceByEspId(espId) {
    return mock.devices.findOne((d) => d.espId.toLowerCase() === espId.toLowerCase());
  },
  async sensor(esp32Id, sensorId) {
    return mock.sensors.findOne((s) => s.esp32Id === esp32Id && s.sensorId === sensorId);
  },
  async addDevice(data) {
    return mock.devices.create({
      ...data,
      criadoEm: new Date(),
      ultimoContato: null,
      revokedAt: null,
    });
  },
  async updateDevice(id, data) {
    return mock.devices.update(id, data)!;
  },
  async addSensor(esp32Id, sensorId, ativoId) {
    mock.sensors.create({
      esp32Id,
      sensorId,
      ativoId,
      criadoEm: new Date(),
      tag: null,
      descricao: null,
      ativoStatus: true,
    });
  },
};

// A limpeza usa o índice (empresa, estado, expiração) e corre fora da transação de cadastro.
let nextPruneAt = 0;
export async function pruneExpiredPairings(empresaId: number) {
  const now = Date.now();
  if (now < nextPruneAt) return;
  nextPruneAt = now + 60 * 60_000;
  const before = new Date(now - 24 * 60 * 60_000);
  if (env.MOCK_MODE) {
    for (const s of sessions.values()) if (s.expiresAt < before) sessions.delete(s.id);
    return;
  }
  for (const state of ['pending', 'approved', 'closed', 'rejected']) {
    await prisma.pairingSession.deleteMany({
      where: { empresaId, state, expiresAt: { lt: before } },
    });
  }
}

let mockQueue: Promise<void> = Promise.resolve();

export async function pairingTransaction<T>(
  action: (store: PairingStore) => Promise<T>,
): Promise<T> {
  if (env.MOCK_MODE) {
    const result = mockQueue.then(() => action(mockStore));
    mockQueue = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction((tx) => action(databaseStore(tx)), {
        isolationLevel: 'Serializable',
      });
    } catch (error) {
      if (error instanceof AppError) throw error;

      if (!isPrismaError(error, 'P2034', 'P2002')) {
        console.error('ERRO REAL DO PAREAMENTO:', error);

        throw new AppError('Persistência do pareamento indisponível.', 503, 'PAIRING_UNAVAILABLE');
      }

      if (attempt === 3) {
        throw new ConflictError('Pareamento em atualização. Tente novamente.');
      }
    }
  }
}
