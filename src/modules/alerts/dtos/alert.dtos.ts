import type { z } from 'zod';
import type { listAlertsQuerySchema } from '../validators/alert.validators.js';

export type ListAlertsQueryDTO = z.infer<typeof listAlertsQuerySchema>;
