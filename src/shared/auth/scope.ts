import { ForbiddenError } from '../errors/app-error.js';
import type { AuthenticatedUser } from '../../types/express.js';

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.tipo === 'ADMIN';
}

/** Alias mantido para compatibilidade interna durante a migração. */
export const isSuperAdmin = isAdmin;

/** Garante que o usuário só acesse dados da própria empresa (ADMIN vê tudo). */
export function assertSameCompany(user: AuthenticatedUser, empresaId: number | null): void {
  if (isSuperAdmin(user)) return;
  if (user.empresaId === null || user.empresaId !== empresaId) {
    throw new ForbiddenError('Você não tem acesso aos dados desta empresa.');
  }
}
