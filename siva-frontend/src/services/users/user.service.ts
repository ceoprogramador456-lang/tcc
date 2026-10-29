import { httpClient } from '../api/http-client';
import type { PaginatedResult, QueryParams } from '../../types/api';
import type {
  CreateUserPayload,
  PublicUser,
  UpdateUserPayload,
  UpdateUserStatusPayload,
} from '../../types/user';

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  empresaId?: number | null;
  tipo?: string | null;
  status?: string | null;
}

/**
 * Operações de usuário.
 *
 * Contrato confirmado no back-end (`src/modules/users`):
 *  - `GET    /api/users`          → paginado (ADMIN, GESTOR)
 *  - `GET    /api/users/:id`      → usuário (ADMIN, GESTOR)
 *  - `POST   /api/users`          → cria (somente ADMIN)
 *  - `PATCH  /api/users/:id`      → edita (somente ADMIN)
 *  - `PATCH  /api/users/:id/status` → ativa/inativa (somente ADMIN)
 *  - `DELETE /api/users/:id`      → remove (somente ADMIN)
 */
export const userService = {
  list(token: string, params: ListUsersParams = {}): Promise<PaginatedResult<PublicUser>> {
    const query: QueryParams = {
      page: params.page,
      pageSize: params.pageSize,
      empresaId: params.empresaId ?? undefined,
      tipo: params.tipo ?? undefined,
      status: params.status ?? undefined,
    };
    return httpClient.getPaginated<PublicUser>('/users', { token, query });
  },

  getById(token: string, id: number): Promise<PublicUser> {
    return httpClient.get<PublicUser>(`/users/${id}`, { token });
  },

  create(token: string, payload: CreateUserPayload): Promise<PublicUser> {
    return httpClient.post<PublicUser>('/users', payload, { token });
  },

  update(token: string, id: number, payload: UpdateUserPayload): Promise<PublicUser> {
    return httpClient.patch<PublicUser>(`/users/${id}`, payload, { token });
  },

  setStatus(token: string, id: number, payload: UpdateUserStatusPayload): Promise<PublicUser> {
    return httpClient.patch<PublicUser>(`/users/${id}/status`, payload, { token });
  },

  remove(token: string, id: number): Promise<void> {
    return httpClient.delete(`/users/${id}`, { token });
  },
};
