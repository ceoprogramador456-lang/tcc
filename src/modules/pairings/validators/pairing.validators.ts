import { z } from 'zod';

export const macSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/-/g, ':').toUpperCase())
  .pipe(z.string().regex(/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/))
  .refine(
    (value) => value !== '00:00:00:00:00:00' && (parseInt(value.slice(0, 2), 16) & 1) === 0,
    'Informe o MAC unicast da interface Wi-Fi da placa.',
  );
export const requestPairingSchema = z
  .object({
    macAddress: macSchema,
    sensorId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,50}$/)
      .default('flow_01'),
  })
  .strict();
export const pairingIdentitySchema = requestPairingSchema.pick({ macAddress: true });
export const pairingCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[-\s]/g, '').toUpperCase())
  .pipe(z.string().regex(/^[0-9A-F]{8}$/, 'Informe os 8 caracteres exibidos no OLED.'));
export const lookupPairingSchema = z.object({ code: pairingCodeSchema }).strict();
export const approvePairingSchema = lookupPairingSchema.extend({
  ativoId: z.coerce.number().int().positive(),
  descricao: z.string().trim().max(100).optional(),
});
