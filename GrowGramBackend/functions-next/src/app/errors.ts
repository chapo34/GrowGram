import type { Express, NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status = 500, code = 'internal_error', message?: string, details?: unknown) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const createError = (status: number, code: string, message?: string, details?: unknown) =>
  new HttpError(status, code, message, details);

function serializeError(err: any, req: Request, res: Response) {
  const requestId = res.locals.requestId as string | undefined;
  const status = Math.max(~~(err?.status || 500), 400);
  const code = String(err?.code || err?.name || 'internal_error');
  const message =
    err?.message ||
    (status === 403 ? 'Forbidden' : status === 404 ? 'Not found' : 'Unexpected error');

  const payload: any = {
    error: { code, message },
    status,
  };
  if (requestId) payload.requestId = requestId;

  // optionale Detailinfos nur in Dev anzeigen
  if (process.env.NODE_ENV !== 'production' && err?.details) {
    payload.details = err.details;
  }
  return payload;
}

/** Zentraler Fehler- & 404-Handler. */
export function attachErrorHandlers(app: Express) {
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err?.name === 'CorsError') {
      const payload = serializeError(new HttpError(403, 'origin_not_allowed', err.message), req, res);
      return res.status(403).json(payload);
    }
    // Express-Validator/Zod/JOI etc. können hier normalisiert werden
    const payload = serializeError(err, req, res);
    if (payload.status >= 500) {
      console.error('API error:', { requestId: payload.requestId, err: err?.stack || err });
    }
    return res.status(payload.status).json(payload);
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Not found' }, status: 404 });
  });
}