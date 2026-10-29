import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/app-error.js';
import { isProduction } from '../config/env.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      req.log?.error({ err }, err.message);
    }
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Prisma: unique constraint -> 409, FK violation -> 409, registro ausente -> 404.
  const code = (err as { code?: unknown } | null)?.code;
  if (code === 'P2002') {
    const target = (err as { meta?: { target?: unknown } }).meta?.target;
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Registro já existe (violação de unicidade).',
        details: target ? { target } : undefined,
      },
    });
    return;
  }
  if (code === 'P2003' || code === 'P2014') {
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message:
          'Operação bloqueada por registros relacionados. Considere inativar em vez de excluir.',
      },
    });
    return;
  }
  if (code === 'P2025') {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
    });
    return;
  }

  req.log?.error({ err }, 'Erro não tratado.');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction
        ? 'Erro interno do servidor.'
        : String(err instanceof Error ? err.message : err),
    },
  });
}
