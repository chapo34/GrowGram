import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { toBool, toInt } from './sanitizer.js';
import { createError } from '../app/errors.js';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
    (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Bearer Token aus Header lesen. */
export function getBearer(req: Request): string | null {
  const h = req.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

/** Limit/Cursor-Parsing mit Bounds. */
export function parsePagination(req: Request, defLimit = 20, maxLimit = 200) {
  const limit = Math.min(Math.max(toInt(req.query.limit, defLimit), 1), maxLimit);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
  return { limit, cursor };
}

export const ok = <T>(res: Response, data: T) => res.status(200).json(data);
export const created = <T>(res: Response, data: T) => res.status(201).json(data);
export const noContent = (res: Response) => res.status(204).end();

/** Einfache Auth-Gate, falls du es on top brauchst. */
export function requireAuth(req: Request) {
  const uid = req.auth?.uid;
  if (!uid) throw createError(401, 'unauthorized', 'Missing auth');
  return uid;
}

/** Feature-Flag Utility (ENV-basiert). */
export function isEnabled(name: string, def = false): boolean {
  const v = process.env[`FF_${name.toUpperCase()}`];
  return v ? toBool(v) : def;
}