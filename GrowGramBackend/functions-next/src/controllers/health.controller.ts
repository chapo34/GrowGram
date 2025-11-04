import type { Request, Response } from 'express';

export function healthz(_req: Request, res: Response) {
  return res.status(200).send('OK');
}