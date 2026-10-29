import { Router } from 'express';
import { authenticateUser, authorize } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { deviceController } from '../controllers/device.controller.js';
import {
  createDeviceSchema,
  deviceIdParamSchema,
  listDevicesQuerySchema,
  updateDeviceSchema,
} from '../validators/device.validators.js';

export const deviceRoutes = Router();

deviceRoutes.use(authenticateUser);

deviceRoutes.get('/', validate({ query: listDevicesQuerySchema }), deviceController.list);
deviceRoutes.get('/:id', validate({ params: deviceIdParamSchema }), deviceController.getById);
deviceRoutes.post(
  '/',
  authorize('ADMIN', 'GESTOR'),
  validate({ body: createDeviceSchema }),
  deviceController.create,
);
deviceRoutes.patch(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: deviceIdParamSchema, body: updateDeviceSchema }),
  deviceController.update,
);
deviceRoutes.delete(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: deviceIdParamSchema }),
  deviceController.remove,
);
