import { httpClient } from '../api/http-client';
import type { PaginatedResult, QueryParams } from '../../types/api';
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from '../../types/asset';

export interface ListAssetsParams {
  page?: number;
  pageSize?: number;
  setorId?: number | null;
  empresaId?: number | null;
  criticidade?: string | null;
}

/**
 * Operações de ativo.
 *
 * Contrato confirmado no back-end (`src/modules/assets`):
 *  - `GET    /api/assets?empresaId=&setorId=&criticidade=` → já escopado pela empresa do ator;
 *  - `GET    /api/assets/:id`   → ativo;
 *  - `POST   /api/assets`       → cria (ADMIN, GESTOR);
 *  - `PATCH  /api/assets/:id`   → edita (ADMIN, GESTOR);
 *  - `DELETE /api/assets/:id`   → remove (ADMIN, GESTOR) — 409 se houver sensores.
 */
export const assetService = {
  list(token: string, params: ListAssetsParams = {}): Promise<PaginatedResult<Asset>> {
    const query: QueryParams = {
      page: params.page,
      pageSize: params.pageSize,
      setorId: params.setorId ?? undefined,
      empresaId: params.empresaId ?? undefined,
      criticidade: params.criticidade ?? undefined,
    };
    return httpClient.getPaginated<Asset>('/assets', { token, query });
  },

  getById(token: string, id: number): Promise<Asset> {
    return httpClient.get<Asset>(`/assets/${id}`, { token });
  },

  create(token: string, payload: CreateAssetPayload): Promise<Asset> {
    return httpClient.post<Asset>('/assets', payload, { token });
  },

  update(token: string, id: number, payload: UpdateAssetPayload): Promise<Asset> {
    return httpClient.patch<Asset>(`/assets/${id}`, payload, { token });
  },

  remove(token: string, id: number): Promise<void> {
    return httpClient.delete(`/assets/${id}`, { token });
  },
};
