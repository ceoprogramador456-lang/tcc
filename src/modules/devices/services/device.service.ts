import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { assertSameCompany, isSuperAdmin } from '../../../shared/auth/scope.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { sectorService } from '../../sectors/services/sector.service.js';
import { createSectorRepository } from '../../sectors/repositories/sector.repository.js';
import { createAssetRepository } from '../../assets/repositories/asset.repository.js';
import { createSensorRepository } from '../../sensors/repositories/sensor.repository.js';
import { createDeviceRepository } from '../repositories/device.repository.js';
import { toPublicDevice } from '../entities/device.entity.js';
import type { CreatedDevice } from '../entities/device.entity.js';
import type { CreateDeviceDTO, UpdateDeviceDTO } from '../dtos/device.dtos.js';
import { generateDeviceToken, hashDeviceToken } from '../../../utils/device-token.js';

const repository = createDeviceRepository();

export interface ListDevicesFilter {
  setorId?: number;
  empresaId?: number;
}

export const deviceService = {
  /**
   * Lista dispositivos respeitando o escopo multiempresa.
   *
   * - com `setorId`: dispositivos daquele setor (setor validado contra a empresa do ator);
   * - com `empresaId`: dispositivos de todos os setores da empresa;
   * - sem filtro: dispositivos da empresa do ator (ADMIN vê todas).
   */
  async list(user: AuthenticatedUser, filter: ListDevicesFilter, options: ListOptions = {}) {
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
      // ADMIN sem filtro: todos os dispositivos.
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
    const device = await repository.findById(id);
    if (!device) throw new NotFoundError('Dispositivo ESP32');
    await sectorService.getAccessible(user, device.setorId);
    return device;
  },

  /**
   * Cria o dispositivo e devolve o token **uma única vez**.
   *
   * O token em claro é gerado aqui, devolvido ao cliente nesta resposta e
   * apenas o hash SHA-256 é persistido.
   */
  async create(user: AuthenticatedUser, data: CreateDeviceDTO): Promise<CreatedDevice> {
    await sectorService.getAccessible(user, data.setorId);
    await this.assertEspIdAvailable(data.espId);

    const token = generateDeviceToken();
    const device = await repository.create({ ...data, tokenHash: hashDeviceToken(token) });
    return { ...toPublicDevice(device), token };
  },

  async update(user: AuthenticatedUser, id: number, data: UpdateDeviceDTO) {
    const current = await this.getAccessible(user, id);

    if (data.espId !== undefined && data.espId !== current.espId) {
      if (current.macAddress)
        throw new ConflictError(
          'A identificação de uma placa pareada vem do MAC e não pode ser alterada.',
        );
      await this.assertEspIdAvailable(data.espId, id);
    }

    if (data.setorId !== undefined && data.setorId !== current.setorId) {
      await sectorService.getAccessible(user, data.setorId);
      await this.assertSensoresNoSetorDestino(id, data.setorId);
    }

    // Edição não altera a credencial; placas pareadas usam o fluxo de novo pareamento.
    const device = await repository.update(id, data);
    if (!device) throw new NotFoundError('Dispositivo ESP32');
    return device;
  },

  async remove(user: AuthenticatedUser, id: number) {
    await this.getAccessible(user, id);
    const { total } = await createSensorRepository().list({ filter: { esp32Id: id }, pageSize: 1 });
    if (total > 0)
      throw new ConflictError(
        'O dispositivo possui sensores vinculados. Use novo pareamento para preservar o histórico.',
      );
    if (!(await repository.remove(id))) throw new NotFoundError('Dispositivo ESP32');
  },

  async assertEspIdAvailable(espId: string, ignoreId?: number): Promise<void> {
    const existentes = await repository.list({ page: 1, pageSize: 100, filter: { espId } });
    const conflito = existentes.items.find((device) => device.id !== ignoreId);
    if (conflito) {
      throw new ConflictError('Já existe um dispositivo com este esp_id.');
    }
  },

  /**
   * Um dispositivo só pode mudar de setor se todos os sensores vinculados
   * estiverem ligados a ativos do setor de destino (regra de negócio do
   * sensor: ativo e ESP32 precisam pertencer ao mesmo setor).
   */
  async assertSensoresNoSetorDestino(esp32Id: number, setorId: number): Promise<void> {
    const sensorRepository = createSensorRepository();
    const { items: sensores } = await sensorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { esp32Id },
    });
    if (sensores.length === 0) return;

    const assetRepository = createAssetRepository();
    for (const sensor of sensores) {
      const asset = await assetRepository.findById(sensor.ativoId);
      if (asset && asset.setorId !== setorId) {
        throw new ConflictError(
          'O dispositivo possui sensores vinculados a ativos de outro setor. Mova os sensores antes.',
        );
      }
    }
  },
};
