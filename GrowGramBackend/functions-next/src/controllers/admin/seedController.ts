import type { Request, Response } from 'express';
import * as svc from '../../services/admin/seed.service.js';

export async function seed(_req: Request, res: Response) {
  await svc.seed();
  return res.json({ ok: true });
}

export async function devSeed(_req: Request, res: Response) {
  if ((svc as any).devSeed) {
    await (svc as any).devSeed();
  } else {
    await svc.seed();
  }
  return res.json({ ok: true });
}