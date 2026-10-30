import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import { env } from '../../../config/env.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../shared/errors/app-error.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { generateDeviceToken, hashDeviceToken } from '../../../utils/device-token.js';
import { assetService } from '../../assets/services/asset.service.js';
import { sectorService } from '../../sectors/services/sector.service.js';
import { deviceService } from '../../devices/services/device.service.js';
import { createDeviceRepository } from '../../devices/repositories/device.repository.js';
import { toPublicDevice } from '../../devices/entities/device.entity.js';
import type { Pairing } from '../entities/pairing.entity.js';
import { pairingRepository } from '../repositories/pairing.repository.js';
import type {
  approvePairingSchema,
  requestPairingSchema,
} from '../validators/pairing.validators.js';

const devices = createDeviceRepository();
const digest = (purpose: string) =>
  createHmac('sha256', env.DEVICE_PAIRING_SECRET ?? env.JWT_SECRET)
    .update(purpose)
    .digest('hex');
const credential = (row: Pairing) => `dev-${digest(`device:v1:${row.id}:${row.secretHash}`)}`;
const assertManager = (actor: AuthenticatedUser) => {
  if (actor.tipo !== 'ADMIN' && actor.tipo !== 'GESTOR') throw new ForbiddenError();
};
const findDevice = async (macAddress: string) =>
  (await devices.list({ filter: { macAddress }, pageSize: 1 })).items[0] ?? null;
function requireSecret(value?: string): string {
  if (!value || !/^[a-f0-9]{64}$/.test(value))
    throw new UnauthorizedError('Chave temporária de pareamento inválida.');
  return value;
}
async function authenticatePairing(mac: string, secret?: string): Promise<Pairing> {
  const hash = hashDeviceToken(requireSecret(secret));
  const row = await pairingRepository.findByMac(mac);
  if (!row || row.expiresAt <= new Date()) throw new NotFoundError('Pareamento ativo');
  if (!timingSafeEqual(Buffer.from(row.secretHash, 'hex'), Buffer.from(hash, 'hex')))
    throw new UnauthorizedError();
  return row;
}

export const pairingService = {
  async request(input: z.infer<typeof requestPairingSchema>, key?: string) {
    const secret = requireSecret(key);
    const secretHash = hashDeviceToken(secret);
    const code = digest(`code:v1:${input.macAddress}:${secret}`).slice(0, 8).toUpperCase();
    const current = await pairingRepository.findByMac(input.macAddress);
    const now = new Date();
    if (current && current.expiresAt > now) {
      if (current.secretHash !== secretHash || current.sensorId !== input.sensorId)
        throw new ConflictError('Já existe um pareamento ativo para esta placa.');
      if (current.status === 'DELIVERED')
        throw new ConflictError('Placa já pareada. Use a credencial salva.');
      return { code, expiresAt: current.expiresAt, status: current.status, pollIntervalMs: 5000 };
    }
    if (current && current.secretHash === secretHash)
      throw new NotFoundError('Código expirado: gere uma nova chave temporária');
    const existing = await findDevice(input.macAddress);
    if (existing && !existing.pairingEnabled)
      throw new ConflictError('Placa já cadastrada. Autorize um novo pareamento no painel.');
    const row: Pairing = {
      id: randomUUID(),
      ...input,
      secretHash,
      codeHash: hashDeviceToken(code),
      status: 'PENDING',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 600_000),
      deviceId: null,
    };
    await pairingRepository.save(row, current);
    return { code, expiresAt: row.expiresAt, status: row.status, pollIntervalMs: 5000 };
  },
  async lookup(actor: AuthenticatedUser, code: string) {
    assertManager(actor);
    const row = await pairingRepository.findByCode(hashDeviceToken(code));
    if (!row || row.expiresAt <= new Date() || row.status !== 'PENDING')
      throw new NotFoundError('Código de pareamento ativo');
    const existing = await findDevice(row.macAddress);
    if (existing) await deviceService.getAccessible(actor, existing.id);
    return { row, existing };
  },
  async preview(actor: AuthenticatedUser, code: string) {
    const { row, existing } = await this.lookup(actor, code);
    return {
      macAddress: row.macAddress,
      sensorId: row.sensorId,
      expiresAt: row.expiresAt,
      existingDeviceId: existing?.id ?? null,
    };
  },
  async approve(actor: AuthenticatedUser, input: z.infer<typeof approvePairingSchema>) {
    const { row, existing } = await this.lookup(actor, input.code);
    const asset = await assetService.getAccessible(actor, input.ativoId);
    const sector = await sectorService.getAccessible(actor, asset.setorId);
    if (existing && (!existing.pairingEnabled || existing.setorId !== asset.setorId))
      throw new ConflictError('O novo pareamento deve preservar o setor do dispositivo.');
    const result = await pairingRepository.approve({
      pairing: row,
      ativoId: asset.id,
      setorId: asset.setorId,
      empresaId: sector.empresaId,
      existingDeviceId: existing?.id ?? null,
      espId: existing?.espId ?? `esp_${row.macAddress.replace(/:/g, '')}`,
      tokenHash: hashDeviceToken(credential(row)),
      descricao: input.descricao ?? null,
      now: new Date(),
    });
    // Browser never receives the device credential.
    return { device: toPublicDevice(result.device), sensor: result.sensor };
  },
  async status(mac: string, key?: string) {
    const row = await authenticatePairing(mac, key);
    if (row.status !== 'APPROVED') return { status: row.status };
    const device = row.deviceId ? await devices.findById(row.deviceId) : null;
    const token = credential(row);
    if (!device || device.pairingEnabled || device.tokenHash !== hashDeviceToken(token))
      throw new ConflictError('Pareamento revogado.');
    // Repeatable until acknowledgement: a dropped HTTP response must not strand the board.
    return { status: 'APPROVED', token, espId: device.espId, sensorId: row.sensorId };
  },
  async acknowledge(mac: string, key?: string) {
    const row = await authenticatePairing(mac, key);
    if (row.status === 'PENDING') throw new ConflictError('Pareamento ainda não aprovado.');
    await pairingRepository.acknowledge(row);
  },
  async reset(actor: AuthenticatedUser, id: number) {
    assertManager(actor);
    const device = await deviceService.getAccessible(actor, id);
    if (!device.macAddress)
      throw new ConflictError(
        'Este dispositivo usa o cadastro legado. Pareie a placa como um novo dispositivo.',
      );
    await pairingRepository.resetDevice(id, hashDeviceToken(generateDeviceToken()));
  },
};
