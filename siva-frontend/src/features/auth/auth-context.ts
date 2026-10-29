import { createContext } from 'react';

import type { LoginCredentials, PublicUser } from '../../types/auth';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthActions {
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => void;
}

/**
 * Estado de autenticação como união discriminada: quando `status` é
 * `authenticated`, `user` e `token` são garantidamente preenchidos.
 */
export type AuthContextValue =
  | (AuthActions & { status: 'loading'; user: null; token: null })
  | (AuthActions & { status: 'anonymous'; user: null; token: null })
  | (AuthActions & { status: 'authenticated'; user: PublicUser; token: string });

export const AuthContext = createContext<AuthContextValue | null>(null);
