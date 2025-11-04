import type { Request, Response } from 'express';

export async function login(_req: Request, res: Response) {
  // TODO
  return res.json({ ok: true });
}

export async function logout(_req: Request, res: Response) {
  return res.status(204).end();
}