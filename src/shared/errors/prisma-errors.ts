import type { Prisma } from '@prisma/client';

/** Detecta erros conhecidos do Prisma sem importar o client em MOCK_MODE. */
export function isPrismaError(error: unknown, ...codes: string[]): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && codes.includes(code)) return true;
  // Mock repository pode propagar erros plain com a mesma convenção.
  const prismaCode = error as { meta?: unknown } as unknown as Prisma.PrismaClientKnownRequestError;
  void prismaCode;
  return false;
}
