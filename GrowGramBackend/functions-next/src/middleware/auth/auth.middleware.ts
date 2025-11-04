import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../../services/auth/jwt.service.js';

export const authRequired: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const hdr = req.headers.authorization || '';
  const token = hdr.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'unauthorized', reason: 'missing_token' });
  }
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = {
      id: payload.sub || payload.userId || payload.id,
      email: payload.email,
      role: payload.role || 'user',
    };
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized', reason: 'invalid_token' });
  }
};