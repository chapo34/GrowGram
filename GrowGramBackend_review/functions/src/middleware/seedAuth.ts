import type { Request, Response, NextFunction } from 'express';

export function requireSeedKey(req: Request, res: Response, next: NextFunction) {
  const key = (req.header('x-seed-key') || req.query.key) as string | undefined;
  if (!process.env.SEED_KEY) {
    return res.status(500).json({ message: 'SEED_KEY missing on server' });
  }
  if (!key || key !== process.env.SEED_KEY) {
    return res.status(401).json({ message: 'Unauthorized (seed key invalid)' });
  }
  return next();
}