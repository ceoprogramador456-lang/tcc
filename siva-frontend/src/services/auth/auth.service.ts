import type { LoginCredentials, LoginResult, PublicUser } from '../../types/auth';
import { httpClient } from '../api/http-client';

/**
 * Operações de autenticação do SIVA.
 *
 * Contrato confirmado no back-end:
 *  - `POST /api/auth/login` → `{ success, data: { token, user } }`
 *  - `GET  /api/auth/me`   → `{ success, data: PublicUser }` (exige `Authorization: Bearer`)
 */
export const authService = {
  login(credentials: LoginCredentials): Promise<LoginResult> {
    return httpClient.post<LoginResult>('/auth/login', credentials);
  },

  me(token: string, options: { signal?: AbortSignal } = {}): Promise<PublicUser> {
    return httpClient.get<PublicUser>('/auth/me', { token, signal: options.signal });
  },
};
