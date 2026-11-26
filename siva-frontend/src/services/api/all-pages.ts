import type { PaginatedResult } from '../../types/api';

export async function allPages<T>(
  load: (page: number) => Promise<PaginatedResult<T>>,
): Promise<T[]> {
  const first = await load(1);
  const items = [...first.items];
  for (let page = 2; page <= first.meta.totalPages; page++) {
    items.push(...(await load(page)).items);
  }
  return items;
}
