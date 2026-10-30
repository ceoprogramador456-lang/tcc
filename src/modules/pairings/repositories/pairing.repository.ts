import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { assets, devices, sectors, sensors } from '../../../shared/mock/mock-store.js';
import type { Pairing, PairingApproval } from '../entities/pairing.entity.js';

// Only the development adapter uses memory. Production persists requests across restarts.
const pending = new Map<string, Pairing>();
const conflict = () =>
  new ConflictError('Pareamento expirado, já aprovado ou alterado. Solicite um novo código.');

export const pairingRepository = {
  async findByMac(macAddress: string): Promise<Pairing | null> {
    if (!env.MOCK_MODE) return prisma.devicePairing.findUnique({ where: { macAddress } });
    return [...pending.values()].find((row) => row.macAddress === macAddress) ?? null;
  },
  async findByCode(codeHash: string): Promise<Pairing | null> {
    if (!env.MOCK_MODE) return prisma.devicePairing.findUnique({ where: { codeHash } });
    return [...pending.values()].find((row) => row.codeHash === codeHash) ?? null;
  },
  async save(row: Pairing, previous: Pairing | null): Promise<void> {
    if (env.MOCK_MODE) {
      const current = [...pending.values()].find((item) => item.macAddress === row.macAddress);
      if (current && (current.id !== previous?.id || current.expiresAt > row.createdAt))
        throw conflict();
      if (
        [...pending.values()].some(
          (item) => item.codeHash === row.codeHash && item.id !== previous?.id,
        )
      )
        throw conflict();
      if (previous) pending.delete(previous.id);
      pending.set(row.id, row);
      return;
    }
    if (!previous) {
      await prisma.devicePairing.create({ data: row });
      return;
    }
    const { count } = await prisma.devicePairing.updateMany({
      where: { id: previous.id, expiresAt: { lte: row.createdAt } },
      data: row,
    });
    if (count !== 1) throw conflict();
  },
  async approve(input: PairingApproval) {
    const {
      pairing,
      now,
      existingDeviceId,
      ativoId,
      setorId,
      empresaId,
      tokenHash,
      espId,
      descricao,
    } = input;
    if (env.MOCK_MODE) {
      // No awaits in this critical section: approval is atomic in the in-memory adapter.
      const current = pending.get(pairing.id);
      const asset = assets.findById(ativoId);
      if (!current || current.status !== 'PENDING' || current.expiresAt <= now) throw conflict();
      if (!asset || asset.setorId !== setorId || sectors.findById(setorId)?.empresaId !== empresaId)
        throw conflict();
      const existing = existingDeviceId === null ? null : devices.findById(existingDeviceId);
      if (existingDeviceId !== null && (!existing?.pairingEnabled || existing.setorId !== setorId))
        throw conflict();
      const oldSensor = existing
        ? sensors.findOne(
            (item) => item.esp32Id === existing.id && item.sensorId === pairing.sensorId,
          )
        : null;
      if (oldSensor && oldSensor.ativoId !== ativoId)
        throw new ConflictError('Selecione o equipamento já vinculado ao sensor.');
      if (
        !existing &&
        devices.findOne((item) => item.espId === espId || item.macAddress === pairing.macAddress)
      )
        throw conflict();
      const device = existing
        ? devices.update(existing.id, { tokenHash, pairingEnabled: false, ultimoContato: null })!
        : devices.create({
            setorId,
            espId,
            macAddress: pairing.macAddress,
            pairingEnabled: false,
            tokenHash,
            descricao,
            ultimoContato: null,
            criadoEm: now,
          });
      const sensor =
        oldSensor ??
        sensors.create({
          esp32Id: device.id,
          ativoId,
          sensorId: pairing.sensorId,
          tag: null,
          descricao: 'Sensor de vazão vinculado no pareamento',
          ativoStatus: true,
          criadoEm: now,
        });
      pending.set(pairing.id, {
        ...current,
        status: 'APPROVED',
        deviceId: device.id,
        expiresAt: new Date(now.getTime() + 600_000),
      });
      return { device, sensor };
    }
    return prisma.$transaction(async (tx) => {
      // Compare-and-set locks the request: a second approver cannot create another device.
      const { count } = await tx.devicePairing.updateMany({
        where: { id: pairing.id, status: 'PENDING', expiresAt: { gt: now } },
        data: { status: 'APPROVED', expiresAt: new Date(now.getTime() + 600_000) },
      });
      if (count !== 1) throw conflict();
      const asset = await tx.ativo.findFirst({
        where: { id: ativoId, setorId, setor: { empresaId } },
      });
      if (!asset) throw conflict();
      let device;
      if (existingDeviceId !== null) {
        const updated = await tx.esp32.updateMany({
          where: {
            id: existingDeviceId,
            macAddress: pairing.macAddress,
            setorId,
            pairingEnabled: true,
          },
          data: { tokenHash, pairingEnabled: false, ultimoContato: null },
        });
        if (updated.count !== 1) throw conflict();
        device = await tx.esp32.findUniqueOrThrow({ where: { id: existingDeviceId } });
      } else {
        device = await tx.esp32.create({
          data: { setorId, espId, macAddress: pairing.macAddress, tokenHash, descricao },
        });
      }
      const oldSensor = await tx.sensor.findUnique({
        where: { esp32Id_sensorId: { esp32Id: device.id, sensorId: pairing.sensorId } },
      });
      if (oldSensor && oldSensor.ativoId !== ativoId)
        throw new ConflictError('Selecione o equipamento já vinculado ao sensor.');
      const sensor =
        oldSensor ??
        (await tx.sensor.create({
          data: {
            esp32Id: device.id,
            ativoId,
            sensorId: pairing.sensorId,
            descricao: 'Sensor de vazão vinculado no pareamento',
          },
        }));
      await tx.devicePairing.update({ where: { id: pairing.id }, data: { deviceId: device.id } });
      return { device, sensor };
    });
  },
  async acknowledge(pairing: Pairing): Promise<void> {
    if (env.MOCK_MODE) {
      const current = pending.get(pairing.id);
      if (current?.status === 'APPROVED')
        pending.set(pairing.id, { ...current, status: 'DELIVERED' });
      return;
    }
    await prisma.devicePairing.updateMany({
      where: { id: pairing.id, status: 'APPROVED' },
      data: { status: 'DELIVERED' },
    });
  },
  async resetDevice(id: number, tokenHash: string): Promise<void> {
    if (env.MOCK_MODE) {
      if (!devices.update(id, { tokenHash, pairingEnabled: true, ultimoContato: null }))
        throw new NotFoundError('ESP32');
      for (const [key, row] of pending) if (row.deviceId === id) pending.delete(key);
      return;
    }
    await prisma.$transaction([
      prisma.esp32.update({
        where: { id },
        data: { tokenHash, pairingEnabled: true, ultimoContato: null },
      }),
      prisma.devicePairing.deleteMany({ where: { deviceId: id } }),
    ]);
  },
};
