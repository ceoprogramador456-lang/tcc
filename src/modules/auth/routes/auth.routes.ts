import { Router } from 'express';
import { authenticateUser } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authController } from '../controllers/auth.controller.js';
import { loginSchema } from '../validators/auth.validators.js';

export const authRoutes = Router();

authRoutes.post('/login', validate({ body: loginSchema }), authController.login);
authRoutes.get('/me', authenticateUser, authController.me);
