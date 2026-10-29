export interface ListOptions {
  page?: number;
  pageSize?: number;
  filter?: Record<string, unknown>;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface CrudRepository<TEntity, TCreateInput, TUpdateInput> {
  list(options?: ListOptions): Promise<ListResult<TEntity>>;
  findById(id: number | string): Promise<TEntity | null>;
  create(data: TCreateInput): Promise<TEntity>;
  update(id: number | string, data: TUpdateInput): Promise<TEntity | null>;
  remove(id: number | string): Promise<boolean>;
}
