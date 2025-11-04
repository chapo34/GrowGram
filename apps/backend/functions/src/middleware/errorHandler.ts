// functions/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';

/** 404-Forwarder – erzeugt einen 404-Error und gibt an den zentralen Handler. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  const err = new Error(`Not Found: ${req.method} ${req.originalUrl}`) as Error & { status?: number };
  err.status = 404;
  next(err);
}

/** Zentraler Error-Handler – einheitliche JSON-Antworten, keine Secrets loggen. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const e = err as Error & { status?: number; statusCode?: number; code?: string };

  const status =
    (e?.statusCode as number) ||
    (e?.status as number) ||
    (typeof e?.message === 'string' && e.message.startsWith('CORS') ? 403 : 500);

  const isEmu = process.env.FUNCTIONS_EMULATOR === 'true' || !!process.env.FIREBASE_EMULATOR_HUB;

  // Minimal und ohne Secrets loggen
  if (isEmu) {
    // eslint-disable-next-line no-console
    console.error('[ERR]', { status, name: e?.name, message: e?.message, stack: e?.stack });
  } else {
    // eslint-disable-next-line no-console
    console.error('[ERR]', { status, name: e?.name, message: e?.message });
  }

  res.status(status).json({
    ok: false,
    error: e?.message || 'Internal Server Error',
    ...(isEmu ? { stack: e?.stack } : {}),
  });
}