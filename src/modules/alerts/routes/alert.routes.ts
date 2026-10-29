import { Router } from 'express';
import { authenticateUser } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { alertController } from '../controllers/alert.controller.js';
import { listAlertsQuerySchema } from '../validators/alert.validators.js';

export const alertRoutes = Router();

alertRoutes.use(authenticateUser);
alertRoutes.get('/', validate({ query: listAlertsQuerySchema }), alertController.list);
