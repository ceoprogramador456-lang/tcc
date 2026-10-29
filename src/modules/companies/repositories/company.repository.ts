import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../../interfaces/repository.interface.js';
import { env } from '../../../config/env.js';
import { prisma } from '../../../database/prisma.js';
import { createMockRepository } from '../../../shared/mock/create-mock-repository.js';
import { companies as companiesMock } from '../../../shared/mock/mock-store.js';
import type { Company } from '../entities/company.entity.js';
import type { CreateCompanyDTO, UpdateCompanyDTO } from '../dtos/company.dtos.js';

export type CompanyRepository = CrudRepository<Company, CreateCompanyDTO, UpdateCompanyDTO>;

const prismaRepository: CompanyRepository = {
  async list(options: ListOptions = {}): Promise<ListResult<Company>> {
    const { page = 1, pageSize = 20, filter = {} } = options;
    const where = filter.id ? { id: Number(filter.id) } : {};
    const [items, total] = await Promise.all([
      prisma.empresa.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      prisma.empresa.count({ where }),
    ]);
    return { items, total };
  },
  async findById(id) {
    return prisma.empresa.findUnique({ where: { id: Number(id) } });
  },
  async create(data) {
    return prisma.empresa.create({ data });
  },
  async update(id, data) {
    try {
      return await prisma.empresa.update({ where: { id: Number(id) }, data });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return null;
      throw error;
    }
  },
  async remove(id) {
    try {
      await prisma.empresa.delete({ where: { id: Number(id) } });
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return false;
      throw error;
    }
  },
};

export function createCompanyRepository(): CompanyRepository {
  return env.MOCK_MODE
    ? createMockRepository(companiesMock, { defaults: () => ({ criadoEm: new Date() }) })
    : prismaRepository;
}
