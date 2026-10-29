import bcrypt from 'bcryptjs';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.js';
import { assertSameCompany, isAdmin } from '../../../shared/auth/scope.js';
import type { ListOptions } from '../../../interfaces/repository.interface.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { toPublicUser } from '../entities/user.entity.js';
import type { CreateUserDTO, UpdateUserDTO } from '../dtos/user.dtos.js';
import { isPrismaError } from '../../../shared/errors/prisma-errors.js';

const repository = createUserRepository();
const SALT_ROUNDS = 10;

function assertValidCombination(
  tipo: string,
  empresaId: number | null | undefined,
  especialidade: string | null | undefined,
): void {
  if (tipo === 'ADMIN') {
    if (empresaId !== undefined && empresaId !== null) {
      throw new ValidationError('ADMIN não deve possuir empresaId.');
    }
    if (especialidade !== undefined && especialidade !== null) {
      throw new ValidationError('ADMIN não deve possuir especialidade.');
    }
  }
  if (tipo === 'GESTOR') {
    if (empresaId === undefined || empresaId === null) {
      throw new ValidationError('empresaId é obrigatório para GESTOR.');
    }
    if (especialidade !== undefined && especialidade !== null) {
      throw new ValidationError('GESTOR não deve possuir especialidade.');
    }
  }
  if (tipo === 'TECNICO') {
    if (empresaId === undefined || empresaId === null) {
      throw new ValidationError('empresaId é obrigatório para TECNICO.');
    }
    if (especialidade === undefined || especialidade === null) {
      throw new ValidationError(
        'especialidade é obrigatória para TECNICO (MECANICO ou ELETRICISTA).',
      );
    }
  }
}

export const userService = {
  async list(actor: AuthenticatedUser, options: ListOptions = {}) {
    const filter = { ...(options.filter ?? {}) };
    if (!isAdmin(actor)) {
      // GESTOR/TECNICO: somente a própria empresa, sem acesso global.
      filter.empresaId = actor.empresaId ?? -1;
    }
    const { items, total } = await repository.list({ ...options, filter });
    return { items: items.map(toPublicUser), total };
  },

  async getAccessible(actor: AuthenticatedUser, id: number) {
    const user = await repository.findById(id);
    if (!user) throw new NotFoundError('Usuário');
    assertSameCompany(actor, user.empresaId);
    return user;
  },

  async create(actor: AuthenticatedUser, data: CreateUserDTO) {
    if (!isAdmin(actor)) {
      throw new ForbiddenError('Somente ADMIN pode criar usuários.');
    }
    assertValidCombination(data.tipo, data.empresaId ?? null, data.especialidade ?? null);

    const existing = await repository.findByEmail(data.email);
    if (existing) throw new ConflictError('E-mail já cadastrado.');

    const senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);
    try {
      const user = await repository.create({
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        tipo: data.tipo,
        empresaId: data.empresaId ?? null,
        especialidade: data.especialidade ?? null,
        status: data.status ?? 'ATIVO',
      } as CreateUserDTO);
      return toPublicUser(user);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw new ConflictError('E-mail já cadastrado.');
      throw error;
    }
  },

  async update(actor: AuthenticatedUser, id: number, data: UpdateUserDTO) {
    if (!isAdmin(actor)) {
      throw new ForbiddenError('Somente ADMIN pode editar usuários.');
    }
    const current = await this.getAccessible(actor, id);

    const nextTipo = data.tipo ?? current.tipo;
    const nextEmpresaId =
      data.empresaId !== undefined ? (data.empresaId ?? null) : (current.empresaId ?? null);
    const nextEspecialidade =
      data.especialidade !== undefined
        ? (data.especialidade ?? null)
        : (current.especialidade ?? null);
    assertValidCombination(nextTipo, nextEmpresaId, nextEspecialidade);

    if (data.email && data.email !== current.email) {
      const existing = await repository.findByEmail(data.email);
      if (existing && existing.id !== id) throw new ConflictError('E-mail já cadastrado.');
    }

    const senha = data.senha ? await bcrypt.hash(data.senha, SALT_ROUNDS) : undefined;
    const payload: Record<string, unknown> = { ...data };
    if (senha) payload.senha = senha;
    else delete payload.senha;
    // Normaliza especialidade de ADMIN/GESTOR para null.
    if (nextTipo !== 'TECNICO') payload.especialidade = null;
    if (nextTipo === 'ADMIN') payload.empresaId = null;

    try {
      const user = await repository.update(id, payload as UpdateUserDTO);
      if (!user) throw new NotFoundError('Usuário');
      return toPublicUser(user);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw new ConflictError('E-mail já cadastrado.');
      throw error;
    }
  },

  async setStatus(actor: AuthenticatedUser, id: number, status: 'ATIVO' | 'INATIVO') {
    if (!isAdmin(actor)) {
      throw new ForbiddenError('Somente ADMIN pode alterar o status de usuários.');
    }
    await this.getAccessible(actor, id);
    const user = await repository.update(id, { status } as unknown as UpdateUserDTO);
    if (!user) throw new NotFoundError('Usuário');
    return toPublicUser(user);
  },

  async remove(actor: AuthenticatedUser, id: number) {
    if (!isAdmin(actor)) {
      throw new ForbiddenError('Somente ADMIN pode excluir usuários.');
    }
    await this.getAccessible(actor, id);
    try {
      const removed = await repository.remove(id);
      if (!removed) throw new NotFoundError('Usuário');
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      const code = (error as { code?: string }).code;
      if (code === 'P2003' || code === 'P2014') {
        throw new ConflictError(
          'Usuário possui registros relacionados e não pode ser excluído. Considere inativá-lo.',
        );
      }
      throw error;
    }
  },
};
