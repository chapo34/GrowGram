// src/middleware/errors/notfound.handler.ts
import type { Request, Response } from 'express';

/** Simple 404-Handler, wenn du auf Router-Ebene einen Abschluss brauchst. */
export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({
    error: { code: 'not_found', message: 'Not found' },
    status: 404,
  });
}