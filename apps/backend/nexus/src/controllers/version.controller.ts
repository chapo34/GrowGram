import type { Request, Response } from 'express';

export function version(_req: Request, res: Response) {
  return res.json({
    ok: true,
    name: 'growgram-backend',
    env: process.env.NODE_ENV || 'development',
    region: process.env.FUNCTION_REGION || 'europe-west3',
    ts: new Date().toISOString(),
  });
}