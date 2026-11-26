import { Router } from 'express';
import { authenticateUser, authorize, denyTecnico } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { dashboardOverviewQuerySchema } from '../validators/dashboard.validators.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticateUser, denyTecnico);

dashboardRoutes.get('/admin-summary', authorize('ADMIN'), dashboardController.adminSummary);

dashboardRoutes.get(
  '/overview',
  authorize('GESTOR'),
  validate({ query: dashboardOverviewQuerySchema }),
  dashboardController.overview,
);
