// src/middleware/auth/roles.middleware.ts
import type { Request, Response, NextFunction } from 'express';
export { authRequired } from './auth.middleware.js';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: { code: 'unauthorized' } });
    const ok = Array.isArray(user.roles) && roles.some(r => user.roles.includes(r));
    if (!ok) return res.status(403).json({ error: { code: 'forbidden', need: roles } });
    next();
  };
}

// Alias, weil deine Routes `requireRoles` importieren
export const requireRoles = requireRole;