import { NotFoundError } from '../../../shared/errors/app-error.js';
import { assertSameCompany, isAdmin } from '../../../shared/auth/scope.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { createCompanyRepository } from '../repositories/company.repository.js';
import { createSectorRepository } from '../../sectors/repositories/sector.repository.js';
import { createAssetRepository } from '../../assets/repositories/asset.repository.js';
import { createDeviceRepository } from '../../devices/repositories/device.repository.js';
import { createSensorRepository } from '../../sensors/repositories/sensor.repository.js';
import { createUserRepository } from '../../users/repositories/user.repository.js';
import { toPublicUser } from '../../users/entities/user.entity.js';
import { toPublicDevice } from '../../devices/entities/device.entity.js';
import type { CreateCompanyDTO, UpdateCompanyDTO } from '../dtos/company.dtos.js';

const repository = createCompanyRepository();

const BIG_PAGE = 10000;

export const companyService = {
  list(user: AuthenticatedUser, options: ListOptions = {}) {
    if (isAdmin(user)) return repository.list(options);
    return repository.list({ ...options, filter: { ...options.filter, id: user.empresaId ?? -1 } });
  },

  async getById(user: AuthenticatedUser, id: number) {
    const company = await repository.findById(id);
    if (!company) throw new NotFoundError('Empresa');
    assertSameCompany(user, company.id);
    return company;
  },

  create(data: CreateCompanyDTO) {
    return repository.create(data);
  },

  async update(id: number, data: UpdateCompanyDTO) {
    const company = await repository.update(id, data);
    if (!company) throw new NotFoundError('Empresa');
    return company;
  },

  async remove(id: number) {
    try {
      const removed = await repository.remove(id);
      if (!removed) throw new NotFoundError('Empresa');
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      const code = (error as { code?: string }).code;
      if (code === 'P2003' || code === 'P2014') {
        const { ConflictError } = await import('../../../shared/errors/app-error.js');
        throw new ConflictError(
          'Empresa possui setores/usuários vinculados e não pode ser excluída.',
        );
      }
      throw error;
    }
  },

  /** Funcionários de uma empresa (sem senha). Somente ADMIN. */
  async usersByCompany(actor: AuthenticatedUser, empresaId: number, options: ListOptions = {}) {
    await this.getById(actor, empresaId);
    const userRepository = createUserRepository();
    const { items, total } = await userRepository.list({
      ...options,
      filter: { ...options.filter, empresaId },
    });
    return { items: items.map(toPublicUser), total };
  },

  /** Agregado para a tela ADMIN → Empresas → Ver mais. */
  async details(actor: AuthenticatedUser, empresaId: number) {
    const empresa = await this.getById(actor, empresaId);

    const sectorRepository = createSectorRepository();
    const assetRepository = createAssetRepository();
    const deviceRepository = createDeviceRepository();
    const sensorRepository = createSensorRepository();
    const userRepository = createUserRepository();

    const [{ items: setores }, { items: funcionarios, total: totalFuncionarios }] =
      await Promise.all([
        sectorRepository.list({ page: 1, pageSize: BIG_PAGE, filter: { empresaId } }),
        userRepository.list({ page: 1, pageSize: BIG_PAGE, filter: { empresaId } }),
      ]);

    let totalAtivos = 0;
    let totalEsp32 = 0;
    let totalSensores = 0;
    const dispositivos: ReturnType<typeof toPublicDevice>[] = [];

    for (const setor of setores) {
      const [{ items: ativos }, { items: esp32s }] = await Promise.all([
        assetRepository.list({ page: 1, pageSize: BIG_PAGE, filter: { setorId: setor.id } }),
        deviceRepository.list({ page: 1, pageSize: BIG_PAGE, filter: { setorId: setor.id } }),
      ]);
      totalAtivos += ativos.length;
      totalEsp32 += esp32s.length;
      for (const esp of esp32s) dispositivos.push(toPublicDevice(esp));
      for (const esp of esp32s) {
        const { total } = await sensorRepository.list({
          page: 1,
          pageSize: 1,
          filter: { esp32Id: esp.id },
        });
        totalSensores += total;
      }
    }

    return {
      empresa,
      funcionarios: funcionarios.map(toPublicUser),
      setores,
      resumo: {
        funcionarios: totalFuncionarios,
        setores: setores.length,
        ativos: totalAtivos,
        esp32: totalEsp32,
        sensores: totalSensores,
      },
    };
  },
};
