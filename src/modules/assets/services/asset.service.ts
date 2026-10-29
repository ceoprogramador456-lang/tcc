import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { assertSameCompany, isSuperAdmin } from '../../../shared/auth/scope.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { sectorService } from '../../sectors/services/sector.service.js';
import { createSectorRepository } from '../../sectors/repositories/sector.repository.js';
import { createDeviceRepository } from '../../devices/repositories/device.repository.js';
import { createSensorRepository } from '../../sensors/repositories/sensor.repository.js';
import { createAssetRepository } from '../repositories/asset.repository.js';
import type { CreateAssetDTO, UpdateAssetDTO } from '../dtos/asset.dtos.js';

const repository = createAssetRepository();

export interface ListAssetsFilter {
  setorId?: number;
  empresaId?: number;
  criticidade?: string;
}

export const assetService = {
  /**
   * Lista ativos respeitando o escopo multiempresa.
   *
   * - com `setorId`: ativos daquele setor (setor validado contra a empresa do ator);
   * - com `empresaId`: ativos de todos os setores da empresa;
   * - sem filtro: ativos da empresa do ator (ADMIN vê todos).
   */
  async list(user: AuthenticatedUser, filter: ListAssetsFilter, options: ListOptions = {}) {
    if (filter.setorId !== undefined) {
      await sectorService.getAccessible(user, filter.setorId);
      return repository.list({
        ...options,
        filter: { ...options.filter, setorId: filter.setorId },
      });
    }

    if (!isSuperAdmin(user) && filter.empresaId !== undefined) {
      assertSameCompany(user, filter.empresaId);
    }

    const empresaId = isSuperAdmin(user) ? (filter.empresaId ?? null) : (user.empresaId ?? -1);

    if (empresaId === null) {
      return repository.list({ ...options, filter: { ...options.filter, setorId: undefined } });
    }

    const setorRepository = createSectorRepository();
    const { items: setores } = await setorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { empresaId },
    });

    return repository.list({
      ...options,
      filter: { ...options.filter, setorId: { in: setores.map((setor) => setor.id) } },
    });
  },

  async getAccessible(user: AuthenticatedUser, id: number) {
    const asset = await repository.findById(id);
    if (!asset) throw new NotFoundError('Ativo');
    await sectorService.getAccessible(user, asset.setorId);
    return asset;
  },

  async create(user: AuthenticatedUser, data: CreateAssetDTO) {
    await sectorService.getAccessible(user, data.setorId);
    await this.assertTagAvailable(data.tag);
    return repository.create(data);
  },

  async update(user: AuthenticatedUser, id: number, data: UpdateAssetDTO) {
    const current = await this.getAccessible(user, id);

    if (data.tag !== undefined && data.tag !== current.tag) {
      await this.assertTagAvailable(data.tag, id);
    }

    if (data.setorId !== undefined && data.setorId !== current.setorId) {
      await sectorService.getAccessible(user, data.setorId);
      await this.assertSensoresNoSetorDestino(id, data.setorId);
    }

    const asset = await repository.update(id, data);
    if (!asset) throw new NotFoundError('Ativo');
    return asset;
  },

  async remove(user: AuthenticatedUser, id: number) {
    await this.getAccessible(user, id);
    await repository.remove(id);
  },

  async assertTagAvailable(tag: string | null | undefined, ignoreId?: number): Promise<void> {
    if (!tag) return;
    const existentes = await repository.list({ page: 1, pageSize: 100, filter: { tag } });
    const conflito = existentes.items.find((asset) => asset.id !== ignoreId);
    if (conflito) {
      throw new ConflictError('Já existe um ativo com esta tag.');
    }
  },

  /**
   * Um ativo só muda de setor se os ESP32 dos seus sensores estiverem no
   * setor de destino (regra: ativo e ESP32 do sensor pertencem ao mesmo setor).
   */
  async assertSensoresNoSetorDestino(ativoId: number, setorId: number): Promise<void> {
    const sensorRepository = createSensorRepository();
    const { items: sensores } = await sensorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { ativoId },
    });
    if (sensores.length === 0) return;

    const deviceRepository = createDeviceRepository();
    for (const sensor of sensores) {
      const device = await deviceRepository.findById(sensor.esp32Id);
      if (device && device.setorId !== setorId) {
        throw new ConflictError(
          'O ativo possui sensores vinculados a ESP32 de outro setor. Mova os dispositivos antes.',
        );
      }
    }
  },
};
