import { z } from 'zod';

export const dashboardOverviewQuerySchema = z.object({
  /** ADMIN pode consultar o painel de uma empresa específica. */
  empresaId: z.coerce.number().int().positive().optional(),
});
