import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.js';
import { isAdmin } from '../../../shared/auth/scope.js';
import { createUserRepository } from '../../users/repositories/user.repository.js';
import { createOrdemServicoRepository } from '../repositories/ordemServico.repository.js';
import type { OrdemServico } from '../entities/ordemServico.entity.js';
import type {
  AceitarOrdemServicoDTO,
  CreateOrdemServicoDTO,
  UpdateOrdemServicoDTO,
} from '../dtos/ordemServico.dtos.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';

const repository = createOrdemServicoRepository();

/**
 * Fluxo de solicitação de serviço.
 *
 * Transições válidas de status: `aberto` → `em_andamento` → `concluido`.
 * - GESTOR: cria (empresa + solicitante derivados do ator, nunca do cliente) e
 *   lista as solicitações da própria empresa.
 * - ADMIN: lista todas (com filtro opcional de empresa), aceita (designa
 *   funcionário) e conclui.
 */
export const ordemServicoService = {
  async list(user: AuthenticatedUser, options: ListOptions = {}) {
    if (!isAdmin(user) && user.empresaId === null) {
      throw new ValidationError(
        'Empresa do usuário não identificada para listar ordens de serviço.',
      );
    }
    const filter = { ...(options.filter ?? {}) };
    if (!isAdmin(user)) filter.empresaId = user.empresaId;
    return repository.list({ ...options, filter });
  },

  async getAccessible(user: AuthenticatedUser, id: number): Promise<OrdemServico> {
    const ordem = await repository.findById(id);
    if (!ordem) throw new NotFoundError('Ordem de serviço');
    return ordem;
  },

  /** Detalhe completo — para visualização (ADMIN). */
  async getById(user: AuthenticatedUser, id: number): Promise<OrdemServico> {
    if (!isAdmin(user))
      throw new ForbiddenError('Somente ADMIN pode visualizar a ordem de serviço.');
    return this.getAccessible(user, id);
  },

  /** Altera o funcionário responsável — permitido em "aberto" e "em andamento". */
  async alterarFuncionario(user: AuthenticatedUser, id: number, funcionarioId: number) {
    if (!isAdmin(user)) {
      throw new ForbiddenError('Somente ADMIN pode alterar o funcionário responsável.');
    }

    const current = await this.getAccessible(user, id);
    if (current.status !== 'aberto' && current.status !== 'em_andamento') {
      throw new ValidationError(
        'Apenas ordens de serviço em status "aberto" ou "em andamento" podem ter o funcionário alterado.',
      );
    }

    const funcionario = await createUserRepository().findById(funcionarioId);
    if (!funcionario) throw new NotFoundError('Funcionário');
    if (funcionario.status === 'INATIVO') {
      throw new ValidationError('Funcionário inativo não pode ser designado.');
    }
    if (funcionario.tipo !== 'TECNICO' || funcionario.empresaId !== current.empresaId) {
      throw new ForbiddenError('Funcionário não é um executor válido para esta empresa.');
    }
    if (funcionario.id === current.funcionarioId) return current;

    const updated = await repository.update(id, { funcionarioId: funcionario.id });
    if (!updated) throw new NotFoundError('Ordem de serviço');
    return updated;
  },

  async create(user: AuthenticatedUser, data: CreateOrdemServicoDTO) {
    if (!isAdmin(user) && user.tipo !== 'GESTOR') {
      throw new ForbiddenError('Somente GESTOR pode criar ordens de serviço.');
    }
    if (user.empresaId === null) {
      throw new ValidationError('Empresa do usuário não identificada para criar a solicitação.');
    }
    return repository.create({
      nome: data.nome,
      tipo: data.tipo,
      descricao: data.descricao ?? null,
      status: 'aberto',
      empresaId: user.empresaId,
      solicitanteId: user.id,
      funcionarioId: null,
      aceitoPor: null,
      aceitoEm: null,
      concluidoEm: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });
  },

  async accept(user: AuthenticatedUser, id: number, data: AceitarOrdemServicoDTO) {
    if (!isAdmin(user)) throw new ForbiddenError('Somente ADMIN aceita ordens de serviço.');

    const current = await this.getAccessible(user, id);
    if (current.status !== 'aberto') {
      throw new ValidationError('Só é possível aceitar uma solicitação em status "aberto".');
    }

    const funcionario = await createUserRepository().findById(data.funcionarioId);
    if (!funcionario) throw new NotFoundError('Funcionário');
    if (funcionario.status === 'INATIVO') {
      throw new ValidationError('Funcionário inativo não pode ser designado.');
    }
    if (funcionario.tipo !== 'TECNICO' || funcionario.empresaId !== current.empresaId) {
      throw new ForbiddenError('Funcionário não é um executor válido para esta empresa.');
    }

    const update: UpdateOrdemServicoDTO = {
      status: 'em_andamento',
      funcionarioId: funcionario.id,
      aceitoPor: user.id,
      aceitoEm: new Date(),
    };
    const accepted = await repository.update(id, update);
    if (!accepted) throw new NotFoundError('Ordem de serviço');
    return accepted;
  },

  async complete(user: AuthenticatedUser, id: number) {
    if (!isAdmin(user)) throw new ForbiddenError('Somente ADMIN conclui ordens de serviço.');

    const current = await this.getAccessible(user, id);
    if (current.status !== 'em_andamento') {
      throw new ValidationError('Só é possível concluir uma solicitação em status "em andamento".');
    }

    const completed = await repository.update(id, { status: 'concluido', concluidoEm: new Date() });
    if (!completed) throw new NotFoundError('Ordem de serviço');
    return completed;
  },
};
