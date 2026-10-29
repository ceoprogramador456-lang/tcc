import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const existing = req.headers['x-request-id'];
  const requestId = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
  res.setHeader('X-Request-Id', requestId);
  req.log = logger.child({ requestId });

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    req.log[level](
      { method: req.method, url: req.originalUrl, statusCode: res.statusCode, durationMs },
      'request',
    );
  });

  next();
}
