import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { sensorService } from '../../sensors/services/sensor.service.js';
import { createUserRepository } from '../../users/repositories/user.repository.js';
import { createSectorRepository } from '../../sectors/repositories/sector.repository.js';
import { createMaintenanceRepository } from '../repositories/maintenance.repository.js';
import type { CreateMaintenanceDTO, UpdateMaintenanceDTO } from '../dtos/maintenance.dtos.js';

const repository = createMaintenanceRepository();

async function assertFuncionarioValido(
  actor: AuthenticatedUser,
  sensorId: number,
  funcionarioId: number | null | undefined,
): Promise<void> {
  if (funcionarioId === undefined || funcionarioId === null) return;
  const userRepository = createUserRepository();
  const funcionario = await userRepository.findById(funcionarioId);
  if (!funcionario) throw new NotFoundError('Funcionário');
  if (funcionario.status === 'INATIVO') {
    throw new ValidationError('Não é possível associar um funcionário INATIVO à manutenção.');
  }
  // O funcionário deve pertencer à mesma empresa do sensor.
  const sensor = await sensorService.getAccessible(actor, sensorId);
  const deviceRepository = (
    await import('../../devices/repositories/device.repository.js')
  ).createDeviceRepository();
  const device = await deviceRepository.findById(sensor.esp32Id);
  if (!device) throw new NotFoundError('Dispositivo ESP32');
  const sectorRepository = createSectorRepository();
  const setor = await sectorRepository.findById(device.setorId);
  if (!setor) throw new NotFoundError('Setor');
  if (funcionario.empresaId === null || funcionario.empresaId !== setor.empresaId) {
    throw new ForbiddenError('Funcionário não pertence à empresa do sensor.');
  }
}

export const maintenanceService = {
  async list(user: AuthenticatedUser, sensorId: number, options: ListOptions = {}) {
    await sensorService.getAccessible(user, sensorId);
    return repository.list({ ...options, filter: { ...options.filter, sensorId } });
  },

  async getAccessible(user: AuthenticatedUser, id: number) {
    const maintenance = await repository.findById(id);
    if (!maintenance) throw new NotFoundError('Chamado de manutenção');
    await sensorService.getAccessible(user, maintenance.sensorId);
    return maintenance;
  },

  async create(user: AuthenticatedUser, data: CreateMaintenanceDTO) {
    await sensorService.getAccessible(user, data.sensorId);
    await assertFuncionarioValido(user, data.sensorId, data.funcionarioId ?? null);
    return repository.create(data);
  },

  async update(user: AuthenticatedUser, id: number, data: UpdateMaintenanceDTO) {
    const current = await this.getAccessible(user, id);
    if (data.funcionarioId !== undefined) {
      await assertFuncionarioValido(user, current.sensorId, data.funcionarioId ?? null);
    }
    const maintenance = await repository.update(id, data);
    if (!maintenance) throw new NotFoundError('Chamado de manutenção');
    return maintenance;
  },

  async remove(user: AuthenticatedUser, id: number) {
    await this.getAccessible(user, id);
    await repository.remove(id);
  },
};
