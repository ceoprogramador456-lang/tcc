import { Router } from 'express';
import {
  authenticateDevice,
  authenticateUser,
  authorize,
  denyTecnico,
} from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { AppError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import { ok } from '../../../shared/http/api-response.js';
import { deviceController } from '../controllers/device.controller.js';
import { pairingController } from '../controllers/pairing.controller.js';
import { streamDeviceEvents } from '../services/device-events.service.js';
import {
  deviceIdParamSchema,
  listDevicesQuerySchema,
  updateDeviceSchema,
} from '../validators/device.validators.js';
import {
  approvalSchema,
  discoverySchema,
  sessionBody,
  sessionParams,
} from '../validators/pairing.validators.js';

export const deviceRoutes = Router();
const manage = authorize('ADMIN', 'GESTOR');

deviceRoutes.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

deviceRoutes.post('/discovery', validate({ body: discoverySchema }), pairingController.discover);
deviceRoutes.post('/pairing/status', validate({ body: sessionBody }), pairingController.status);
deviceRoutes.post('/credentials', validate({ body: sessionBody }), pairingController.pickup);
deviceRoutes.post(
  '/pairing/ack',
  authenticateDevice,
  validate({ body: sessionBody }),
  pairingController.acknowledge,
);
deviceRoutes.get('/me', authenticateDevice, (req, res) => {
  ok(res, { espId: req.device!.espId });
});

deviceRoutes.use(authenticateUser, denyTecnico);
deviceRoutes.get('/events', (req, res) => {
  if (!req.userSessionExpiresAt) throw new UnauthorizedError('Sessão sem expiração.');
  // Limita a duração da conexão para revalidar a sessão durante reconexões.
  const expiresAt = Math.min(req.userSessionExpiresAt, Date.now() + 30 * 60_000);
  streamDeviceEvents(req.user!, expiresAt, res);
});
deviceRoutes.get('/pending', manage, pairingController.pending);
deviceRoutes.post(
  '/pairing/:id/approve',
  manage,
  validate({ params: sessionParams, body: approvalSchema }),
  pairingController.approve,
);
deviceRoutes.post(
  '/pairing/:id/reject',
  manage,
  validate({ params: sessionParams }),
  pairingController.reject,
);
deviceRoutes.post(
  '/:id/revoke',
  manage,
  validate({ params: deviceIdParamSchema }),
  pairingController.revoke,
);

deviceRoutes.get('/', validate({ query: listDevicesQuerySchema }), deviceController.list);
deviceRoutes.get('/:id', validate({ params: deviceIdParamSchema }), deviceController.getById);
deviceRoutes.post('/', manage, () => {
  throw new AppError(
    'Ligue o ESP32 e confirme o código na lista de pendentes.',
    410,
    'PAIRING_REQUIRED',
  );
});
deviceRoutes.patch(
  '/:id',
  manage,
  validate({ params: deviceIdParamSchema, body: updateDeviceSchema }),
  deviceController.update,
);
deviceRoutes.delete(
  '/:id',
  manage,
  validate({ params: deviceIdParamSchema }),
  deviceController.remove,
);
