import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { toPublicDevice } from '../entities/device.entity.js';
import { deviceService } from '../services/device.service.js';

export const deviceController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const filter = {
      setorId: req.query.setorId !== undefined ? Number(req.query.setorId) : undefined,
      empresaId: req.query.empresaId !== undefined ? Number(req.query.empresaId) : undefined,
    };
    const { items, total } = await deviceService.list(req.user!, filter, { page, pageSize });
    paginated(res, items.map(toPublicDevice), { total, page, pageSize });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const device = await deviceService.getAccessible(req.user!, Number(req.params.id));
    ok(res, toPublicDevice(device));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    // Token só é exposto na criação — trate como um segredo (como uma API key).
    const device = await deviceService.create(req.user!, req.body);
    created(res, device);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const device = await deviceService.update(req.user!, Number(req.params.id), req.body);
    ok(res, toPublicDevice(device));
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await deviceService.remove(req.user!, Number(req.params.id));
    noContent(res);
  }),
};
