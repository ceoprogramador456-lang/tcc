import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, paginated } from '../../../shared/http/api-response.js';
import { parsePagination } from '../../../shared/http/pagination.js';
import { readingService } from '../services/reading.service.js';

export const readingController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePagination(req);
    const { items, total } = await readingService.list(req.user!, Number(req.query.sensorId), {
      page,
      pageSize,
    });
    paginated(res, items, { total, page, pageSize });
  }),

  ingest: asyncHandler(async (req: Request, res: Response) => {
    const reading = await readingService.ingest(req.device!, req.body);
    created(res, reading);
  }),
};
