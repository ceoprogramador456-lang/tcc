import { httpClient } from '../api/http-client';
import type { PaginatedResult, QueryParams } from '../../types/api';
import type { CreateSectorPayload, Sector, UpdateSectorPayload } from '../../types/sector';

export interface ListSectorsParams {
  page?: number;
  pageSize?: number;
  empresaId?: number | null;
}

/**
 * Operações de setor.
 *
 * Contrato confirmado no back-end (`src/modules/sectors`):
 *  - `GET    /api/sectors?empresaId=` → listagem já escopada pela empresa do ator;
 *  - `GET    /api/sectors/:id`       → setor;
 *  - `POST   /api/sectors`           → cria (ADMIN, GESTOR);
 *  - `PATCH  /api/sectors/:id`       → edita (ADMIN, GESTOR);
 *  - `DELETE /api/sectors/:id`       → remove (ADMIN, GESTOR) — 409 se houver ativos/ESP32.
 */
export const sectorService = {
  list(token: string, params: ListSectorsParams = {}): Promise<PaginatedResult<Sector>> {
    const query: QueryParams = {
      page: params.page,
      pageSize: params.pageSize,
      empresaId: params.empresaId ?? undefined,
    };
    return httpClient.getPaginated<Sector>('/sectors', { token, query });
  },

  getById(token: string, id: number): Promise<Sector> {
    return httpClient.get<Sector>(`/sectors/${id}`, { token });
  },

  create(token: string, payload: CreateSectorPayload): Promise<Sector> {
    return httpClient.post<Sector>('/sectors', payload, { token });
  },

  update(token: string, id: number, payload: UpdateSectorPayload): Promise<Sector> {
    return httpClient.patch<Sector>(`/sectors/${id}`, payload, { token });
  },

  remove(token: string, id: number): Promise<void> {
    return httpClient.delete(`/sectors/${id}`, { token });
  },
};
