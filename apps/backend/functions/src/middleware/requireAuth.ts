// functions/src/middleware/requireAuth.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as functionsConf from 'firebase-functions/v1';

const cfg: any = (functionsConf as any).config?.() ?? {};
const JWT_SECRET: string =
  (cfg?.jwt?.secret as string | undefined) ||
  (process.env.JWT_SECRET as string | undefined) ||
  '';

/** Schlanke Middleware für einfache Token-Prüfung (setzt `req.auth`). */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';

  if (!token) {
    res.status(401).json({ error: 'Missing Bearer token' });
    return;
  }
  if (!JWT_SECRET) {
    res.status(500).json({ error: 'JWT secret missing on server' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).auth = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export default requireAuth;