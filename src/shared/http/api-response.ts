import type { Response } from 'express';

export function ok<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, data });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; pageSize: number },
): Response {
  const totalPages = Math.max(1, Math.ceil(meta.total / Math.max(1, meta.pageSize)));
  return res.status(200).json({ success: true, data, meta: { ...meta, totalPages } });
}
