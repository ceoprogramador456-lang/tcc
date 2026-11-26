import { z } from 'zod';
import { createAssetSchema } from '../../assets/validators/asset.validators.js';

export const discoverySchema = z
  .object({
    mac: z
      .string()
      .regex(/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i)
      .transform((mac) => mac.toUpperCase()),
    firmwareVersion: z.string().trim().min(1).max(32),
    model: z.string().trim().min(1).max(64),
    sensorId: z.string().trim().min(1).max(50),
  })
  .strict();

export const sessionBody = z.object({ sessionId: z.string().uuid() }).strict();
export const sessionParams = z.object({ id: z.string().uuid() });
const approvalFields = z.object({
  code: z.string().regex(/^\d{6}$/),
  setorId: z.number().int().positive(),
  descricao: z.string().trim().max(100).optional(),
});
export const approvalSchema = z.union([
  approvalFields.extend({ ativoId: z.number().int().positive() }).strict(),
  approvalFields
    .extend({
      novoAtivo: z.object({ nome: z.string().trim().pipe(createAssetSchema.shape.nome) }).strict(),
    })
    .strict(),
]);
export type Discovery = z.infer<typeof discoverySchema>;
export type Approval = z.infer<typeof approvalSchema>;
