import { defineConfig } from 'vitest/config';

if (!process.env.DATABASE_URL)
  throw new Error('Defina DATABASE_URL para um banco MySQL de testes isolado.');
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/mysql/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      MOCK_MODE: 'false',
      LOG_LEVEL: 'silent',
      JWT_SECRET: 'integration-test-secret-only',
      DATABASE_URL: process.env.DATABASE_URL,
    },
  },
});
