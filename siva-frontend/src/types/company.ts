/**
 * Contratos de empresa.
 *
 * Espelha `Company` / `CreateCompanyDTO` / `UpdateCompanyDTO` do backend
 * (ver `src/modules/companies/entities/company.entity.ts`).
 */

import type { Sector } from './catalog';
import type { PublicUser } from './user';

/** SIVA = dona do sistema; CLIENTE = empresa que adquiriu o sistema. */
export type TipoEmpresa = 'SIVA' | 'CLIENTE';

export interface Company {
  id: number;
  nome: string;
  cnpj: string | null;
  tipo: TipoEmpresa;
  criadoEm: string;
}

/**
 * O `tipo` não é aceito no cadastro: empresas criadas pela API nascem sempre
 * como `CLIENTE`. A SIVA é criada por migration/seed.
 */
export interface CreateCompanyPayload {
  nome: string;
  cnpj?: string | null;
}

export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

/** Resposta de `GET /api/companies/:id/details` (somente ADMIN). */
export interface CompanyDetails {
  empresa: Company;
  funcionarios: PublicUser[];
  setores: Sector[];
  resumo: {
    funcionarios: number;
    setores: number;
    ativos: number;
    esp32: number;
    sensores: number;
  };
}
