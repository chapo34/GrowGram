// functions/src/middleware/seedAuth.ts
import type { Request, Response, NextFunction } from 'express';

export function requireSeedKey(req: Request, res: Response, next: NextFunction): void {
  const key = (req.header('x-seed-key') || (req.query.key as string | undefined)) ?? '';
  const want = process.env.SEED_KEY || '';

  if (!want) {
    res.status(500).json({ message: 'SEED_KEY missing on server' });
    return;
  }
  if (!key || key !== want) {
    res.status(401).json({ message: 'Unauthorized (seed key invalid)' });
    return;
  }
  next();
}

export default requireSeedKey;