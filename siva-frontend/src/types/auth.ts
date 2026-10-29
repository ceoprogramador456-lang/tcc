/**
 * Contratos de autenticação.
 *
 * Espelha `LoginDTO` / `LoginResult` do backend
 * (ver `src/modules/auth/dtos/auth.dtos.ts`).
 */

import type { PublicUser } from './user';

export type { Especialidade, PublicUser, StatusUsuario, UserType } from './user';

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}
