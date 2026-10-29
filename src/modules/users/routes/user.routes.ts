import { Router } from 'express';
import { authenticateUser, authorize } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { userController } from '../controllers/user.controller.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
  userStatusSchema,
} from '../validators/user.validators.js';

export const userRoutes = Router();

userRoutes.use(authenticateUser);

userRoutes.get(
  '/',
  authorize('ADMIN', 'GESTOR'),
  validate({ query: listUsersQuerySchema }),
  userController.list,
);
userRoutes.get(
  '/:id',
  authorize('ADMIN', 'GESTOR'),
  validate({ params: userIdParamSchema }),
  userController.getById,
);
// Somente ADMIN cria / edita / altera status / exclui.
userRoutes.post(
  '/',
  authorize('ADMIN'),
  validate({ body: createUserSchema }),
  userController.create,
);
userRoutes.patch(
  '/:id',
  authorize('ADMIN'),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  userController.update,
);
userRoutes.patch(
  '/:id/status',
  authorize('ADMIN'),
  validate({ params: userIdParamSchema, body: userStatusSchema }),
  userController.setStatus,
);
userRoutes.delete(
  '/:id',
  authorize('ADMIN'),
  validate({ params: userIdParamSchema }),
  userController.remove,
);
