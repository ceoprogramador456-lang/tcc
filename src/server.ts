import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { disconnectDatabase } from './database/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, mockMode: env.MOCK_MODE, env: env.NODE_ENV },
    `SIVA API rodando em http://localhost:${env.PORT} (docs em /docs)${env.MOCK_MODE ? ' — MOCK_MODE ativo, sem MySQL necessário' : ''}`,
  );
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Encerrando servidor...');
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
