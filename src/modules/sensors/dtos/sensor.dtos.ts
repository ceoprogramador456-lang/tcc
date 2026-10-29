import type { z } from 'zod';
import type { createSensorSchema, updateSensorSchema } from '../validators/sensor.validators.js';

export type CreateSensorDTO = z.infer<typeof createSensorSchema>;
export type UpdateSensorDTO = z.infer<typeof updateSensorSchema>;
