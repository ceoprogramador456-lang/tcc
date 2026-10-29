import { z } from 'zod';

// Espelha o payload documentado no README enviado pelo firmware do ESP32.
export const ingestReadingSchema = z.object({
  esp_id: z.string().min(1),
  setor: z.string().optional(),
  sensor_id: z.string().min(1),
  vazao: z.coerce.number().min(0),
});

export const listReadingsQuerySchema = z.object({
  sensorId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});
