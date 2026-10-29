import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { assertSameCompany, isSuperAdmin } from '../../../shared/auth/scope.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { createAssetRepository } from '../../assets/repositories/asset.repository.js';
import { createDeviceRepository } from '../../devices/repositories/device.repository.js';
import { createSectorRepository } from '../repositories/sector.repository.js';
import type { CreateSectorDTO, UpdateSectorDTO } from '../dtos/sector.dtos.js';

const repository = createSectorRepository();

export const sectorService = {
  list(user: AuthenticatedUser, options: ListOptions = {}) {
    const empresaId = isSuperAdmin(user) ? options.filter?.empresaId : (user.empresaId ?? -1);
    return repository.list({ ...options, filter: { ...options.filter, empresaId } });
  },

  /** Busca o setor garantindo que ele pertence à empresa do usuário autenticado. */
  async getAccessible(user: AuthenticatedUser, id: number) {
    const sector = await repository.findById(id);
    if (!sector) throw new NotFoundError('Setor');
    assertSameCompany(user, sector.empresaId);
    return sector;
  },

  async create(user: AuthenticatedUser, data: CreateSectorDTO) {
    assertSameCompany(user, data.empresaId);
    return repository.create(data);
  },

  async update(user: AuthenticatedUser, id: number, data: UpdateSectorDTO) {
    await this.getAccessible(user, id);
    const sector = await repository.update(id, data);
    if (!sector) throw new NotFoundError('Setor');
    return sector;
  },

  async remove(user: AuthenticatedUser, id: number) {
    await this.getAccessible(user, id);

    // A remoção é bloqueada quando há ativos ou dispositivos vinculados.
    // A verificação é explícita (e não só via FK) para que o comportamento
    // seja o mesmo no modo mock, onde não existem constraints de banco.
    const [ativos, dispositivos] = await Promise.all([
      createAssetRepository().list({ page: 1, pageSize: 1, filter: { setorId: id } }),
      createDeviceRepository().list({ page: 1, pageSize: 1, filter: { setorId: id } }),
    ]);

    if (ativos.total > 0 || dispositivos.total > 0) {
      throw new ConflictError(
        'O setor possui ativos ou dispositivos ESP32 vinculados e não pode ser excluído. ' +
          'Remova ou transfira esses registros primeiro.',
      );
    }

    await repository.remove(id);
  },
};
