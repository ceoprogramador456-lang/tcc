import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  sensorId: z.coerce.number().int().positive(),
  tipo: z.enum(['preventiva', 'corretiva', 'inspecao']),
  descricao: z.string().max(2000).optional().nullable(),
  funcionarioId: z.coerce.number().int().positive().optional().nullable(),
});

export const updateMaintenanceSchema = z.object({
  status: z.enum(['aberto', 'em_andamento', 'concluido']).optional(),
  descricao: z.string().max(2000).optional().nullable(),
  funcionarioId: z.coerce.number().int().positive().optional().nullable(),
});

export const maintenanceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listMaintenancesQuerySchema = z.object({
  sensorId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
