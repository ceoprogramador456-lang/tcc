export type ClassValue = string | number | null | undefined | false | ClassValue[];

function flatten(value: ClassValue): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flatten);
  return [String(value)];
}

/** Concatena classes ignorando valores vazios, sem dependências externas. */
export function cn(...values: ClassValue[]): string {
  return values.flatMap(flatten).join(' ');
}
