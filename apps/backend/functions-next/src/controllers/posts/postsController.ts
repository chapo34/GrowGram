import type { Request, Response } from 'express';

export async function createJsonPost(_req: Request, res: Response) {
  return res.json({ post: { id: 'p1' } });
}

export async function setVisibility(_req: Request, res: Response) {
  return res.status(204).end();
}

export async function patchPost(_req: Request, res: Response) {
  return res.status(501).json({ error: 'not_implemented' });
}