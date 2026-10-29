import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) {
      // Express 5 expõe `req.query` como getter sem setter — não dá para reatribuir,
      // então validamos e mutamos as chaves do objeto existente.
      const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
      const current = req.query as Record<string, unknown>;
      Object.keys(current).forEach((key) => delete current[key]);
      Object.assign(current, parsed);
    }
    next();
  };
}
