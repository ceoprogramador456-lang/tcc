import { httpClient } from '../api/http-client';
import type { PaginatedResult, QueryParams } from '../../types/api';
import type {
  Company,
  CompanyDetails,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from '../../types/company';

export interface ListCompaniesParams {
  page?: number;
  pageSize?: number;
}

/**
 * Operações de empresa.
 *
 * Contrato confirmado no back-end (`src/modules/companies`):
 *  - `GET    /api/companies`             → paginado (ADMIN vê todas)
 *  - `GET    /api/companies/:id`         → empresa
 *  - `GET    /api/companies/:id/details` → agregado (somente ADMIN)
 *  - `GET    /api/companies/:id/users`   → funcionários (somente ADMIN)
 *  - `POST   /api/companies`             → cria (somente ADMIN)
 *  - `PATCH  /api/companies/:id`         → edita (somente ADMIN)
 *  - `DELETE /api/companies/:id`         → remove (somente ADMIN)
 */
export const companyService = {
  list(token: string, params: ListCompaniesParams = {}): Promise<PaginatedResult<Company>> {
    const query: QueryParams = { page: params.page, pageSize: params.pageSize };
    return httpClient.getPaginated<Company>('/companies', { token, query });
  },

  getById(token: string, id: number): Promise<Company> {
    return httpClient.get<Company>(`/companies/${id}`, { token });
  },

  details(token: string, id: number): Promise<CompanyDetails> {
    return httpClient.get<CompanyDetails>(`/companies/${id}/details`, { token });
  },

  create(token: string, payload: CreateCompanyPayload): Promise<Company> {
    return httpClient.post<Company>('/companies', payload, { token });
  },

  update(token: string, id: number, payload: UpdateCompanyPayload): Promise<Company> {
    return httpClient.patch<Company>(`/companies/${id}`, payload, { token });
  },

  remove(token: string, id: number): Promise<void> {
    return httpClient.delete(`/companies/${id}`, { token });
  },
};
