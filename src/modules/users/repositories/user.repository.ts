import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { users as usersMock } from '../../../shared/mock/mock-store.js';
import type { User } from '../entities/user.entity.js';
import type { CreateUserDTO, UpdateUserDTO } from '../dtos/user.dtos.js';

export type UserRepository = CrudRepository<User, CreateUserDTO, UpdateUserDTO> & {
  findByEmail(email: string): Promise<User | null>;
};

function buildWhere(filter: Record<string, unknown>) {
  const where: Record<string, unknown> = {};
  if (filter.id !== undefined) where.id = Number(filter.id);
  if (filter.empresaId !== undefined) where.empresaId = Number(filter.empresaId);
  if (filter.tipo !== undefined) where.tipo = filter.tipo;
  if (filter.status !== undefined) where.status = filter.status;
  if (filter.especialidade !== undefined) where.especialidade = filter.especialidade;
  return where;
}

const prismaRepository: UserRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<User>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = buildWhere(filter);
    const [items, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.usuario.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.usuario.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.usuario.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.usuario.update({ where: { id: Number(id) }, data });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return null;
      throw error;
    }
  },
  async remove(id) {
    try {
      await prisma.usuario.delete({ where: { id: Number(id) } });
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return false;
      throw error;
    }
  },
  async findByEmail(email) {
    return prisma.usuario.findUnique({ where: { email } });
  },
};

const mockRepository: UserRepository = {
  ...createMockRepository<User, CreateUserDTO, UpdateUserDTO>(usersMock, {
    defaults: () => ({ criadoEm: new Date() }),
  }),
  async findByEmail(email) {
    return usersMock.findOne((item) => item.email === email);
  },
};

export function createUserRepository(): UserRepository {
  return env.MOCK_MODE ? mockRepository : prismaRepository;
}
