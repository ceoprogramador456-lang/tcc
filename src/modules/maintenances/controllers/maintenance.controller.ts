import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { maintenanceService } from '../services/maintenance.service.js';

export const maintenanceController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const { items, total } = await maintenanceService.list(req.user!, Number(req.query.sensorId), {
      page,
      pageSize,
    });
    paginated(res, items, { total, page, pageSize });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const maintenance = await maintenanceService.getAccessible(req.user!, Number(req.params.id));
    ok(res, maintenance);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const maintenance = await maintenanceService.create(req.user!, req.body);
    created(res, maintenance);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const maintenance = await maintenanceService.update(req.user!, Number(req.params.id), req.body);
    ok(res, maintenance);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await maintenanceService.remove(req.user!, Number(req.params.id));
    noContent(res);
  }),
};
