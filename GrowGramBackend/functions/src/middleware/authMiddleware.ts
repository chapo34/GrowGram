// functions/src/middleware/authMiddleware.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import * as functionsConf from 'firebase-functions/v1';

export interface JwtPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

const cfg: any = (functionsConf as any).config?.() ?? {};
const JWT_SECRET: string =
  (cfg?.jwt?.secret as string | undefined) ||
  (process.env.JWT_SECRET as string | undefined) ||
  '';

/** Express-Middleware: prüft Bearer-Token, hängt `req.user` an. */
export function auth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    res.status(401).json({ message: '❌ Kein Token vorhanden' });
    return;
  }

  if (!JWT_SECRET) {
    res.status(500).json({ message: 'JWT secret missing on server' });
    return;
  }

  const token = h.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: '❌ Token ungültig oder abgelaufen' });
  }
}

export default auth;