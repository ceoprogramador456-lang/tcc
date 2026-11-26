import { Router } from 'express';
import { authenticateUser, authorize, denyTecnico } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { sectorController } from '../controllers/sector.controller.js';
import {
  createSectorSchema,
  listSectorsQuerySchema,
  sectorIdParamSchema,
  updateSectorSchema,
} from '../validators/sector.validators.js';

export const sectorRoutes = Router();

sectorRoutes.use(authenticateUser, denyTecnico);

sectorRoutes.get('/', validate({ query: listSectorsQuerySchema }), sectorController.list);
sectorRoutes.get('/:id', validate({ params: sectorIdParamSchema }), sectorController.getById);
sectorRoutes.post(
  '/',
  authorize('ADMIN', 'GESTOR'),
  validate({ body: createSectorSchema }),
  sectorController.create,
);
sectorRoutes.patch(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: sectorIdParamSchema, body: updateSectorSchema }),
  sectorController.update,
);
sectorRoutes.delete(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: sectorIdParamSchema }),
  sectorController.remove,
);
