import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, noContent, ok, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { companyService } from '../services/company.service.js';

export const companyController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const { items, total } = await companyService.list(req.user!, { page, pageSize });
    paginated(res, items, { total, page, pageSize });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.getById(req.user!, Number(req.params.id));
    ok(res, company);
  }),

  details: asyncHandler(async (req: Request, res: Response) => {
    const details = await companyService.details(req.user!, Number(req.params.id));
    ok(res, details);
  }),

  users: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const { items, total } = await companyService.usersByCompany(req.user!, Number(req.params.id), {
      page,
      pageSize,
    });
    paginated(res, items, { total, page, pageSize });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.create(req.body);
    created(res, company);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.update(Number(req.params.id), req.body);
    ok(res, company);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await companyService.remove(Number(req.params.id));
    noContent(res);
  }),
};
