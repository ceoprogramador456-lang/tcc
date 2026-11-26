import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, ok, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { ordemServicoService } from '../services/ordemServico.service.js';

export const ordemServicoController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const empresaId = req.query.empresaId ? Number(req.query.empresaId) : undefined;

    const { items, total } = await ordemServicoService.list(req.user!, {
      page,
      pageSize,
      filter: { status, empresaId },
    });
    paginated(res, items, { total, page, pageSize });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const ordem = await ordemServicoService.create(req.user!, req.body);
    created(res, ordem);
  }),

  accept: asyncHandler(async (req: Request, res: Response) => {
    const ordem = await ordemServicoService.accept(req.user!, Number(req.params.id), req.body);
    ok(res, ordem);
  }),

  complete: asyncHandler(async (req: Request, res: Response) => {
    const ordem = await ordemServicoService.complete(req.user!, Number(req.params.id));
    ok(res, ordem);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const ordem = await ordemServicoService.getById(req.user!, Number(req.params.id));
    ok(res, ordem);
  }),

  alterarFuncionario: asyncHandler(async (req: Request, res: Response) => {
    const ordem = await ordemServicoService.alterarFuncionario(
      req.user!,
      Number(req.params.id),
      req.body.funcionarioId,
    );
    ok(res, ordem);
  }),
};
