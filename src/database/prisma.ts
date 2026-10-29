import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

declare global {
  var __sivaPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

// Em MOCK_MODE nunca instanciamos o client de verdade: assim o time de frontend
// consegue rodar a API sem MySQL disponível e sem `prisma generate` ter sido executado
// contra um banco real.
export const prisma: PrismaClient = env.MOCK_MODE
  ? (undefined as unknown as PrismaClient)
  : (global.__sivaPrisma ?? createPrismaClient());

if (!env.MOCK_MODE && env.NODE_ENV !== 'production') {
  global.__sivaPrisma = prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (!env.MOCK_MODE) {
    await prisma.$disconnect();
  }
}
