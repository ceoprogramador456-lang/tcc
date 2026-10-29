import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { sensorService } from '../services/sensor.service.js';

export const sensorController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const filter = {
      esp32Id: req.query.esp32Id ? Number(req.query.esp32Id) : undefined,
      ativoId: req.query.ativoId ? Number(req.query.ativoId) : undefined,
      empresaId: req.query.empresaId ? Number(req.query.empresaId) : undefined,
      ativoStatus:
        req.query.ativoStatus === undefined ? undefined : req.query.ativoStatus === 'true',
    };
    const { items, total } = await sensorService.list(req.user!, filter, { page, pageSize });
    paginated(res, items, { total, page, pageSize });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const sensor = await sensorService.getAccessible(req.user!, Number(req.params.id));
    ok(res, sensor);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const sensor = await sensorService.create(req.user!, req.body);
    created(res, sensor);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const sensor = await sensorService.update(req.user!, Number(req.params.id), req.body);
    ok(res, sensor);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await sensorService.remove(req.user!, Number(req.params.id));
    noContent(res);
  }),
};
