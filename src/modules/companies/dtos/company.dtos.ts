import type { z } from 'zod';
import type { createCompanySchema, updateCompanySchema } from '../validators/company.validators.js';

export type CreateCompanyDTO = z.infer<typeof createCompanySchema>;
export type UpdateCompanyDTO = z.infer<typeof updateCompanySchema>;
