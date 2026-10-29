export class MockCollection<T extends { id: number }> {
  private items: T[] = [];
  private nextId = 1;

  seed(rows: Array<Omit<T, 'id'>>): void {
    rows.forEach((row) => this.create(row));
  }

  list(predicate?: (item: T) => boolean): T[] {
    const rows = predicate ? this.items.filter(predicate) : this.items;
    return rows.map((row) => ({ ...row }));
  }

  findById(id: number): T | null {
    const item = this.items.find((row) => row.id === id);
    return item ? { ...item } : null;
  }

  findOne(predicate: (item: T) => boolean): T | null {
    const item = this.items.find(predicate);
    return item ? { ...item } : null;
  }

  create(data: Omit<T, 'id'>): T {
    const entity = { ...data, id: this.nextId++ } as T;
    this.items.push(entity);
    return { ...entity };
  }

  update(id: number, data: Partial<Omit<T, 'id'>>): T | null {
    const index = this.items.findIndex((row) => row.id === id);
    if (index === -1) return null;
    const current = this.items[index] as T;
    // Assim como o Prisma, um valor `undefined` significa "não altere este campo".
    const definedEntries = Object.entries(data as Record<string, unknown>).filter(
      ([, value]) => value !== undefined,
    );
    const updated = { ...current, ...Object.fromEntries(definedEntries) } as T;
    this.items[index] = updated;
    return { ...updated };
  }

  remove(id: number): boolean {
    const index = this.items.findIndex((row) => row.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}
