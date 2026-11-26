import { z } from 'zod';

export const createDeviceSchema = z.object({
  setorId: z.coerce.number().int().positive(),
  espId: z.string().min(2).max(50),
  descricao: z.string().max(100).optional().nullable(),
});

export const updateDeviceSchema = z.object({
  setorId: z.coerce.number().int().positive().optional(),
  espId: z.string().min(2).max(50).optional(),
  descricao: z.string().max(100).optional().nullable(),
});

export const deviceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listDevicesQuerySchema = z.object({
  setorId: z.coerce.number().int().positive().optional(),
  empresaId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
