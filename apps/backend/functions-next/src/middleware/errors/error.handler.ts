// src/middleware/errors/error.handler.ts
import type { NextFunction, Request, Response } from 'express';

/**
 * Router-lokaler Error-Handler. Nützlich, wenn du für einen Teilbaum
 * eigene Fehlerantworten willst. Ist kompatibel zu deinem globalen
 * attachErrorHandlers() in src/app/errors.ts.
 */
export function routerErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);

  const requestId = res.locals.requestId as string | undefined;
  const status = Math.max(~~(err?.status || 500), 400);
  const code = String(err?.code || err?.name || 'internal_error');
  const message =
    err?.message ||
    (status === 403 ? 'Forbidden' : status === 404 ? 'Not found' : 'Unexpected error');

  const payload: any = { error: { code, message }, status };
  if (requestId) payload.requestId = requestId;
  if (process.env.NODE_ENV !== 'production' && err?.details) payload.details = err.details;

  if (status >= 500) {
    console.error('[routerErrorHandler]', { requestId, err: err?.stack || err });
  }
  return res.status(status).json(payload);
}