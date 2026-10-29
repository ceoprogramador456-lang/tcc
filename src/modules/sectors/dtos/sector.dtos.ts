import type { z } from 'zod';
import type { createSectorSchema, updateSectorSchema } from '../validators/sector.validators.js';

export type CreateSectorDTO = z.infer<typeof createSectorSchema>;
export type UpdateSectorDTO = z.infer<typeof updateSectorSchema>;
