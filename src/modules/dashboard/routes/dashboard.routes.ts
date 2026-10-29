import { Router } from 'express';
import { authenticateUser, authorize } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { dashboardOverviewQuerySchema } from '../validators/dashboard.validators.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticateUser);

dashboardRoutes.get('/admin-summary', authorize('ADMIN'), dashboardController.adminSummary);

dashboardRoutes.get(
  '/overview',
  validate({ query: dashboardOverviewQuerySchema }),
  dashboardController.overview,
);
