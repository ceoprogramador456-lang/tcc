import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticateUser, authorize } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { deviceIdParamSchema } from '../../devices/validators/device.validators.js';
import { pairingController as controller } from '../controllers/pairing.controller.js';
import {
  approvePairingSchema,
  lookupPairingSchema,
  pairingIdentitySchema,
  requestPairingSchema,
} from '../validators/pairing.validators.js';

const limiter = (limit: number) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Aguarde um minuto antes de tentar novamente.' },
    },
  });
export function createPairingRoutes() {
  const pairingRoutes = Router();
  pairingRoutes.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  pairingRoutes.post(
    '/request',
    limiter(6),
    validate({ body: requestPairingSchema }),
    controller.request,
  );
  pairingRoutes.post(
    '/status',
    limiter(30),
    validate({ body: pairingIdentitySchema }),
    controller.status,
  );
  pairingRoutes.post(
    '/acknowledge',
    limiter(10),
    validate({ body: pairingIdentitySchema }),
    controller.acknowledge,
  );
  pairingRoutes.use(authenticateUser, authorize('ADMIN', 'GESTOR'));
  const codeLimiter = limiter(10);
  pairingRoutes.post(
    '/lookup',
    codeLimiter,
    validate({ body: lookupPairingSchema }),
    controller.lookup,
  );
  pairingRoutes.post(
    '/approve',
    codeLimiter,
    validate({ body: approvePairingSchema }),
    controller.approve,
  );
  pairingRoutes.post(
    '/devices/:id/reset',
    limiter(5),
    validate({ params: deviceIdParamSchema }),
    controller.reset,
  );

  return pairingRoutes;
}
