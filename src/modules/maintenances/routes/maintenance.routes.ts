import { Router } from 'express';
import { authenticateUser } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { maintenanceController } from '../controllers/maintenance.controller.js';
import {
  createMaintenanceSchema,
  listMaintenancesQuerySchema,
  maintenanceIdParamSchema,
  updateMaintenanceSchema,
} from '../validators/maintenance.validators.js';

export const maintenanceRoutes = Router();

maintenanceRoutes.use(authenticateUser);

maintenanceRoutes.get(
  '/',
  validate({ query: listMaintenancesQuerySchema }),
  maintenanceController.list,
);
maintenanceRoutes.get(
  '/:id',
  validate({ params: maintenanceIdParamSchema }),
  maintenanceController.getById,
);
maintenanceRoutes.post(
  '/',
  validate({ body: createMaintenanceSchema }),
  maintenanceController.create,
);
maintenanceRoutes.patch(
  '/:id',
  validate({ params: maintenanceIdParamSchema, body: updateMaintenanceSchema }),
  maintenanceController.update,
);
maintenanceRoutes.delete(
  '/:id',
  validate({ params: maintenanceIdParamSchema }),
  maintenanceController.remove,
);
