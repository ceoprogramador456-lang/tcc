import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { alertService } from '../services/alert.service.js';

export const alertController = {
  list: asyncHandler(async (_req: Request, _res: Response) => {
    alertService.list();
  }),
};
