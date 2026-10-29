import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { sectorService } from '../services/sector.service.js';

export const sectorController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const empresaId = req.query.empresaId ? Number(req.query.empresaId) : undefined;
    const { items, total } = await sectorService.list(req.user!, {
      page,
      pageSize,
      filter: { empresaId },
    });
    paginated(res, items, { total, page, pageSize });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const sector = await sectorService.getAccessible(req.user!, Number(req.params.id));
    ok(res, sector);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const sector = await sectorService.create(req.user!, req.body);
    created(res, sector);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const sector = await sectorService.update(req.user!, Number(req.params.id), req.body);
    ok(res, sector);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await sectorService.remove(req.user!, Number(req.params.id));
    noContent(res);
  }),
};
