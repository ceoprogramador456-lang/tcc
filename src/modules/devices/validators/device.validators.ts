import { z } from 'zod';

export const createDeviceSchema = z.object({
  setorId: z.coerce.number().int().positive(),
  espId: z.string().min(2).max(50),
  descricao: z.string().max(100).optional().nullable(),
});

/**
 * Campos editáveis de um dispositivo.
 *
 * O token nunca é editável — trocá-lo exige uma operação explícita de
 * recriação do dispositivo (o back-end só devolve o token na criação).
 */
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
