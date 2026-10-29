import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MOCK_MODE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(8).default('troque-este-valor-em-producao'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Falha ao carregar configuração de ambiente.');
}

if (!parsed.data.MOCK_MODE && !parsed.data.DATABASE_URL) {
  console.error('DATABASE_URL é obrigatório quando MOCK_MODE=false.');
  throw new Error('Falha ao carregar configuração de ambiente.');
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
