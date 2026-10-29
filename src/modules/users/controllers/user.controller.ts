import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { toPublicUser } from '../entities/user.entity.js';
import { userService } from '../services/user.service.js';

export const userController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const filter: Record<string, unknown> = {};
    if (req.query.empresaId !== undefined) filter.empresaId = Number(req.query.empresaId);
    if (req.query.tipo !== undefined) filter.tipo = String(req.query.tipo);
    if (req.query.status !== undefined) filter.status = String(req.query.status);
    const { items, total } = await userService.list(req.user!, { page, pageSize, filter });
    paginated(res, items, { total, page, pageSize });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getAccessible(req.user!, Number(req.params.id));
    ok(res, toPublicUser(user));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.user!, req.body);
    created(res, user);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.update(req.user!, Number(req.params.id), req.body);
    ok(res, user);
  }),

  setStatus: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.setStatus(req.user!, Number(req.params.id), req.body.status);
    ok(res, user);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await userService.remove(req.user!, Number(req.params.id));
    noContent(res);
  }),
};
