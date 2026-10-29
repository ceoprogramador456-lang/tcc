import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { ok } from '../../../shared/http/api-response.js';
import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  adminSummary: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await dashboardService.adminSummary(req.user!));
  }),

  overview: asyncHandler(async (req: Request, res: Response) => {
    const empresaId = req.query.empresaId !== undefined ? Number(req.query.empresaId) : undefined;
    ok(res, await dashboardService.overview(req.user!, empresaId));
  }),
};
