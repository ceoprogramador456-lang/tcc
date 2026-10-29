import { z } from 'zod';

export const assetCriticalitySchema = z.enum(['baixa', 'media', 'alta']);

export const createAssetSchema = z.object({
  setorId: z.coerce.number().int().positive(),
  nome: z.string().min(2).max(100),
  tag: z.string().max(50).optional().nullable(),
  tipo: z.string().max(50).optional().nullable(),
  criticidade: assetCriticalitySchema.default('media'),
  centroCusto: z.string().max(50).optional().nullable(),
  fotoUrl: z.string().url().max(255).optional().nullable(),
  manualUrl: z.string().url().max(255).optional().nullable(),
  descricao: z.string().max(255).optional().nullable(),
});

/**
 * Campos editáveis de um ativo.
 *
 * `setorId` pode mudar, mas o service só aceita a mudança quando os ESP32 dos
 * sensores vinculados ao ativo já estiverem no setor de destino.
 */
export const updateAssetSchema = createAssetSchema.partial();

export const assetIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listAssetsQuerySchema = z.object({
  setorId: z.coerce.number().int().positive().optional(),
  empresaId: z.coerce.number().int().positive().optional(),
  criticidade: assetCriticalitySchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
