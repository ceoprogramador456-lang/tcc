import type { z } from 'zod';
import type { createCompanySchema, updateCompanySchema } from '../validators/company.validators.js';
import type { TipoEmpresa } from '../entities/company.entity.js';

/**
 * O `tipo` não é aceito pela API: empresas criadas pelo CRUD nascem sempre
 * como CLIENTE. O campo existe no DTO para que o service possa defini-lo.
 */
export type CreateCompanyDTO = z.infer<typeof createCompanySchema> & {
  tipo?: TipoEmpresa;
};
export type UpdateCompanyDTO = z.infer<typeof updateCompanySchema>;
