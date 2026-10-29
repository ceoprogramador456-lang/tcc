import { z } from 'zod';

export const listAlertsQuerySchema = z.object({
  sensorId: z.coerce.number().int().positive().optional(),
});
