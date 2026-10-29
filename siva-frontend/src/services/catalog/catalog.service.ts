import { httpClient } from '../api/http-client';
import type { PaginatedResult } from '../../types/api';
import type { Asset, Device, Sector } from '../../types/catalog';

/**
 * Entidades de apoio usadas nos seletores em cascata
 * (empresa → setor → ativo / ESP32).
 *
 * O back-end escopa estas listagens pela empresa do usuário autenticado; o
 * `setorId` continua disponível para filtrar dentro de um setor.
 */
export const catalogService = {
  sectors(token: string, empresaId?: number | null): Promise<PaginatedResult<Sector>> {
    return httpClient.getPaginated<Sector>('/sectors', {
      token,
      query: { empresaId: empresaId ?? undefined, pageSize: 100 },
    });
  },

  assets(token: string, params: { setorId?: number | null; empresaId?: number | null }): Promise<
    PaginatedResult<Asset>
  > {
    return httpClient.getPaginated<Asset>('/assets', {
      token,
      query: {
        setorId: params.setorId ?? undefined,
        empresaId: params.empresaId ?? undefined,
        pageSize: 100,
      },
    });
  },

  devices(
    token: string,
    params: { setorId?: number | null; empresaId?: number | null },
  ): Promise<PaginatedResult<Device>> {
    return httpClient.getPaginated<Device>('/devices', {
      token,
      query: {
        setorId: params.setorId ?? undefined,
        empresaId: params.empresaId ?? undefined,
        pageSize: 100,
      },
    });
  },
};
