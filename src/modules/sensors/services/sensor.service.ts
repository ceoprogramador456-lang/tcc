import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import { assertSameCompany, isSuperAdmin } from '../../../shared/auth/scope.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { assetService } from '../../assets/services/asset.service.js';
import { deviceService } from '../../devices/services/device.service.js';
import { createSectorRepository } from '../../sectors/repositories/sector.repository.js';
import { createAssetRepository } from '../../assets/repositories/asset.repository.js';
import { createSensorRepository } from '../../sensors/repositories/sensor.repository.js';
import type { CreateSensorDTO, UpdateSensorDTO } from '../dtos/sensor.dtos.js';

const repository = createSensorRepository();

export interface ListSensorsFilter {
  esp32Id?: number;
  ativoId?: number;
  empresaId?: number;
  ativoStatus?: boolean;
}

export const sensorService = {
  /**
   * Lista sensores respeitando o escopo multiempresa.
   *
   * O sensor pertence à empresa do seu **ativo** (ativo → setor → empresa).
   */
  async list(user: AuthenticatedUser, filter: ListSensorsFilter, options: ListOptions = {}) {
    if (filter.esp32Id !== undefined) {
      await deviceService.getAccessible(user, filter.esp32Id);
    }
    if (filter.ativoId !== undefined) {
      await assetService.getAccessible(user, filter.ativoId);
    }

    const baseFilter: Record<string, unknown> = { ...options.filter };

    if (filter.esp32Id !== undefined) baseFilter.esp32Id = filter.esp32Id;
    if (filter.ativoId !== undefined) baseFilter.ativoId = filter.ativoId;
    if (filter.ativoStatus !== undefined) baseFilter.ativoStatus = filter.ativoStatus;

    if (filter.empresaId !== undefined) {
      if (!isSuperAdmin(user)) {
        assertSameCompany(user, filter.empresaId);
      }
      baseFilter.ativoId = { in: await this.listAtivoIdsDaEmpresa(filter.empresaId) };
    } else if (!isSuperAdmin(user)) {
      // Sem filtro explícito, o escopo do ator é a própria empresa.
      baseFilter.ativoId = { in: await this.listAtivoIdsDaEmpresa(user.empresaId ?? -1) };
    }

    return repository.list({ ...options, filter: baseFilter });
  },

  async getAccessible(user: AuthenticatedUser, id: number) {
    const sensor = await repository.findById(id);
    if (!sensor) throw new NotFoundError('Sensor');
    await assetService.getAccessible(user, sensor.ativoId);
    return sensor;
  },

  async create(user: AuthenticatedUser, data: CreateSensorDTO) {
    const [asset, device] = await Promise.all([
      assetService.getAccessible(user, data.ativoId),
      deviceService.getAccessible(user, data.esp32Id),
    ]);
    if (asset.setorId !== device.setorId) {
      throw new ValidationError('O ativo e o ESP32 informados precisam pertencer ao mesmo setor.');
    }

    await this.assertIdentidadeDisponivel(data.esp32Id, data.sensorId);
    await this.assertTagDisponivel(data.tag);

    return repository.create(data);
  },

  async update(user: AuthenticatedUser, id: number, data: UpdateSensorDTO) {
    await this.getAccessible(user, id);

    if (data.tag !== undefined) {
      await this.assertTagDisponivel(data.tag, id);
    }

    const sensor = await repository.update(id, data);
    if (!sensor) throw new NotFoundError('Sensor');
    return sensor;
  },

  async remove(user: AuthenticatedUser, id: number) {
    await this.getAccessible(user, id);
    await repository.remove(id);
  },

  /** `sensorId` precisa ser único dentro do mesmo ESP32. */
  async assertIdentidadeDisponivel(
    esp32Id: number,
    sensorId: string,
    ignoreId?: number,
  ): Promise<void> {
    const existentes = await repository.list({
      page: 1,
      pageSize: 100,
      filter: { esp32Id },
    });
    const conflito = existentes.items.find(
      (sensor) => sensor.sensorId === sensorId && sensor.id !== ignoreId,
    );
    if (conflito) {
      throw new ConflictError('Este esp_id já possui um sensor com este sensor_id.');
    }
  },

  /** A `tag` é a identificação física do sensor e é única na plataforma. */
  async assertTagDisponivel(tag: string | null | undefined, ignoreId?: number): Promise<void> {
    if (!tag) return;
    const existentes = await repository.list({ page: 1, pageSize: 100, filter: { tag } });
    const conflito = existentes.items.find((sensor) => sensor.id !== ignoreId);
    if (conflito) {
      throw new ConflictError('Já existe um sensor com esta tag.');
    }
  },

  /** IDs dos ativos de uma empresa (ativo → setor → empresa). */
  async listAtivoIdsDaEmpresa(empresaId: number): Promise<number[]> {
    const setorRepository = createSectorRepository();
    const { items: setores } = await setorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { empresaId },
    });
    if (setores.length === 0) return [];

    const assetRepository = createAssetRepository();
    const { items: ativos } = await assetRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { setorId: { in: setores.map((setor) => setor.id) } },
    });
    return ativos.map((ativo) => ativo.id);
  },
};
