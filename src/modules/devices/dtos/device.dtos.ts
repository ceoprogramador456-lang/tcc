import type { z } from 'zod';
import type { createDeviceSchema, updateDeviceSchema } from '../validators/device.validators.js';

export type CreateDeviceDTO = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceDTO = z.infer<typeof updateDeviceSchema>;
