import type { z } from 'zod';
import type { ingestReadingSchema } from '../validators/reading.validators.js';

export type IngestReadingDTO = z.infer<typeof ingestReadingSchema>;

export interface CreateReadingDTO {
  sensorId: number;
  vazao: number;
}
