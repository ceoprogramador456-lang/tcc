import { z } from 'zod';

export const createSectorSchema = z.object({
  empresaId: z.coerce.number().int().positive(),
  nome: z.string().min(2).max(100),
});

export const updateSectorSchema = createSectorSchema.partial().omit({ empresaId: true });

export const sectorIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listSectorsQuerySchema = z.object({
  empresaId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
