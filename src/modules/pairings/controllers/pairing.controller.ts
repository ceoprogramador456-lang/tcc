import type { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { created, noContent, ok } from '../../../shared/http/api-response.js';
import { pairingService } from '../services/pairing.service.js';

export const pairingController = {
  request: asyncHandler(async (req: Request, res: Response) =>
    created(res, await pairingService.request(req.body, req.get('X-Pairing-Key'))),
  ),
  status: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await pairingService.status(req.body.macAddress, req.get('X-Pairing-Key'))),
  ),
  acknowledge: asyncHandler(async (req: Request, res: Response) => {
    await pairingService.acknowledge(req.body.macAddress, req.get('X-Pairing-Key'));
    noContent(res);
  }),
  lookup: asyncHandler(async (req: Request, res: Response) =>
    ok(res, await pairingService.preview(req.user!, req.body.code)),
  ),
  approve: asyncHandler(async (req: Request, res: Response) =>
    created(res, await pairingService.approve(req.user!, req.body)),
  ),
  reset: asyncHandler(async (req: Request, res: Response) => {
    await pairingService.reset(req.user!, Number(req.params.id));
    noContent(res);
  }),
};
