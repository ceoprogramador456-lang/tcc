import { z } from 'zod';

export const createCompanySchema = z.object({
  nome: z.string().min(2).max(100),
  cnpj: z.string().max(20).optional().nullable(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const companyIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
