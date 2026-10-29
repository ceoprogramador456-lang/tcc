import type { z } from 'zod';
import type { createAssetSchema, updateAssetSchema } from '../validators/asset.validators.js';

export type CreateAssetDTO = z.infer<typeof createAssetSchema>;
export type UpdateAssetDTO = z.infer<typeof updateAssetSchema>;
