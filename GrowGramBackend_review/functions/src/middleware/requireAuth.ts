import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import functions from 'firebase-functions';

const cfg: any = (functions as any).config ? (functions as any).config() : {};
const JWT_SECRET = cfg?.jwt?.secret || process.env.JWT_SECRET || 'CHANGE_ME';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).auth = { userId: payload.userId, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}