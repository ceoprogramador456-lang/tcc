import type { z } from 'zod';
import type {
  createMaintenanceSchema,
  updateMaintenanceSchema,
} from '../validators/maintenance.validators.js';

export type CreateMaintenanceDTO = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceDTO = z.infer<typeof updateMaintenanceSchema>;
