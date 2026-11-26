import { Router } from 'express';
import { authenticateUser, authorize, denyTecnico } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { assetController } from '../controllers/asset.controller.js';
import {
  assetIdParamSchema,
  createAssetSchema,
  listAssetsQuerySchema,
  updateAssetSchema,
} from '../validators/asset.validators.js';

export const assetRoutes = Router();

assetRoutes.use(authenticateUser, denyTecnico);

assetRoutes.get(
  '/',
  authorize('GESTOR'),
  validate({ query: listAssetsQuerySchema }),
  assetController.list,
);
assetRoutes.get('/:id', validate({ params: assetIdParamSchema }), assetController.getById);
assetRoutes.post(
  '/',
  authorize('ADMIN', 'GESTOR'),
  validate({ body: createAssetSchema }),
  assetController.create,
);
assetRoutes.patch(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: assetIdParamSchema, body: updateAssetSchema }),
  assetController.update,
);
assetRoutes.delete(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: assetIdParamSchema }),
  assetController.remove,
);
