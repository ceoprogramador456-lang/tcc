import type {
  CrudRepository,
  ListOptions,
  ListResult,
} from '../../interfaces/repository.interface.js';
import { isInFilter, matchesIdFilter } from '../../utils/id-filter.js';
import type { MockCollection } from './mock-collection.js';

export interface MockRepositoryOptions<TEntity> {
  matchesFilter?: (item: TEntity, filter: Record<string, unknown>) => boolean;
  /** Preenche campos com valor padrão (ex: criadoEm) que não vêm no DTO de criação. */
  defaults?: () => Partial<Omit<TEntity, 'id'>>;
}

/**
 * Adapta uma MockCollection para o contrato CrudRepository, para que services
 * e controllers não saibam se estão falando com o Prisma ou com a memória.
 */
export function createMockRepository<TEntity extends { id: number }, TCreateInput, TUpdateInput>(
  collection: MockCollection<TEntity>,
  options: MockRepositoryOptions<TEntity> = {},
): CrudRepository<TEntity, TCreateInput, TUpdateInput> {
  const matchesFilter = options.matchesFilter ?? defaultMatch;
  const defaults = options.defaults ?? ((): Partial<Omit<TEntity, 'id'>> => ({}));

  return {
    async list(listOptions: ListOptions = {}): Promise<ListResult<TEntity>> {
      const { page = 1, pageSize = 20, filter = {} } = listOptions;
      const all = collection.list((item) => matchesFilter(item, filter));
      const start = (page - 1) * pageSize;
      return { items: all.slice(start, start + pageSize), total: all.length };
    },
    async findById(id) {
      return collection.findById(Number(id));
    },
    async create(data) {
      return collection.create({ ...defaults(), ...(data as object) } as Omit<TEntity, 'id'>);
    },
    async update(id, data) {
      return collection.update(Number(id), data as unknown as Partial<Omit<TEntity, 'id'>>);
    },
    async remove(id) {
      return collection.remove(Number(id));
    },
  };
}

export function defaultMatch<TEntity>(item: TEntity, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (value === undefined) return true;

    const actual = (item as Record<string, unknown>)[key];

    // Operador `{ in: [...] }` — mesmo contrato usado pelo Prisma (`where`).
    if (isInFilter(value)) {
      return matchesIdFilter(actual, value);
    }

    return actual === value;
  });
}
