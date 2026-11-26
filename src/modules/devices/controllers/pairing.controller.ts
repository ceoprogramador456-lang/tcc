import { ok, noContent } from '../../../shared/http/api-response.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { pairingSecretHash, pairingService } from '../services/pairing.service.js';

export const pairingController = {
  discover: asyncHandler(async (req, res) => {
    const secret = pairingSecretHash(req.get('X-Pairing-Secret'));
    ok(res, await pairingService.discover(req.body, secret));
  }),
  status: asyncHandler(async (req, res) => {
    const secret = pairingSecretHash(req.get('X-Pairing-Secret'));
    ok(res, await pairingService.status(req.body.sessionId, secret));
  }),
  pickup: asyncHandler(async (req, res) => {
    const secret = pairingSecretHash(req.get('X-Pairing-Secret'));
    ok(res, await pairingService.pickup(req.body.sessionId, secret));
  }),
  acknowledge: asyncHandler(async (req, res) => {
    await pairingService.acknowledge(req.body.sessionId, req.device!);
    noContent(res);
  }),
  pending: asyncHandler(async (req, res) => {
    ok(res, await pairingService.pending(req.user!));
  }),
  approve: asyncHandler(async (req, res) => {
    ok(res, await pairingService.approve(String(req.params.id), req.body, req.user!));
  }),
  reject: asyncHandler(async (req, res) => {
    await pairingService.reject(String(req.params.id), req.user!);
    noContent(res);
  }),
  revoke: asyncHandler(async (req, res) => {
    await pairingService.revoke(Number(req.params.id), req.user!);
    noContent(res);
  }),
};
