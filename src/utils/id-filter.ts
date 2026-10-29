/**
 * Filtro de identificadores aceito pelos repositories.
 *
 * O mesmo contrato vale para o Prisma (`where: { setorId: { in: [...] } }`) e
 * para o mock em memória, garantindo paridade de comportamento entre os dois
 * modos de execução.
 */
export type IdFilter = number | number[] | { in: number[] };

export function isInFilter(value: unknown): value is { in: number[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'in' in value &&
    Array.isArray((value as { in: unknown }).in)
  );
}

/** Normaliza `12`, `[1, 2]` ou `{ in: [1, 2] }` para o formato do Prisma. */
export function normalizeIdFilter(value: unknown): number | { in: number[] } {
  if (Array.isArray(value)) return { in: value.map(Number) };
  if (isInFilter(value)) return { in: value.in.map(Number) };
  return Number(value);
}

/** Verifica se um valor satisfaz o filtro (usado pelo mock em memória). */
export function matchesIdFilter(actual: unknown, expected: unknown): boolean {
  if (isInFilter(expected)) {
    // Comparação textual: funciona para IDs numéricos e para enums.
    return expected.in.some((item) => String(item) === String(actual));
  }
  return actual === expected;
}

/**
 * Normaliza um filtro de lista para o formato `{ in: [...] }` do Prisma,
 * preservando valores simples.
 */
export function normalizeListFilter(value: unknown): unknown {
  if (Array.isArray(value)) return { in: value };
  return value;
}
