import { Router } from 'express';
import { authenticateDevice, authenticateUser } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { readingController } from '../controllers/reading.controller.js';
import { ingestReadingSchema, listReadingsQuerySchema } from '../validators/reading.validators.js';

export const readingRoutes = Router();

// Endpoint chamado pelo firmware do ESP32 — autenticado por X-Token, não por JWT de usuário.
readingRoutes.post(
  '/',
  authenticateDevice,
  validate({ body: ingestReadingSchema }),
  readingController.ingest,
);

readingRoutes.get(
  '/',
  authenticateUser,
  validate({ query: listReadingsQuerySchema }),
  readingController.list,
);
