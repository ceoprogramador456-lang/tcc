import { Router } from 'express';
import { authenticateUser, authorize } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { sensorController } from '../controllers/sensor.controller.js';
import {
  createSensorSchema,
  listSensorsQuerySchema,
  sensorIdParamSchema,
  updateSensorSchema,
} from '../validators/sensor.validators.js';

export const sensorRoutes = Router();

sensorRoutes.use(authenticateUser);

sensorRoutes.get('/', validate({ query: listSensorsQuerySchema }), sensorController.list);
sensorRoutes.get('/:id', validate({ params: sensorIdParamSchema }), sensorController.getById);
sensorRoutes.post(
  '/',
  authorize('ADMIN', 'GESTOR'),
  validate({ body: createSensorSchema }),
  sensorController.create,
);
sensorRoutes.patch(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: sensorIdParamSchema, body: updateSensorSchema }),
  sensorController.update,
);
sensorRoutes.delete(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: sensorIdParamSchema }),
  sensorController.remove,
);
