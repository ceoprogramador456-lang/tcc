import { useAuth } from './use-auth';
import type { PublicUser } from '../../../types/auth';

export interface AuthenticatedSession {
  user: PublicUser;
  token: string;
}

/**
 * Retorna a sessão autenticada ou `null`.
 *
 * Usada nas telas administrativas, protegidas por `<RequireAdmin>` — que
 * garante sessão ativa e perfil ADMIN antes de renderizar o conteúdo.
 */
export function useAuthenticatedSession(): AuthenticatedSession | null {
  const auth = useAuth();

  if (auth.status !== 'authenticated') return null;

  return { user: auth.user, token: auth.token };
}
