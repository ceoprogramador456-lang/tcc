import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { ok } from '../../../shared/http/api-response.js';
import { authService } from '../services/auth.service.js';

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    ok(res, result);
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!);
    ok(res, user);
  }),
};
