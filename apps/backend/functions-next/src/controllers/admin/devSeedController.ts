import type { Request, Response } from 'express';

export async function reindex(_req: Request, res: Response) {
  // TODO: echte Reindex-Logik (Search/Score neu berechnen)
  return res.json({ ok: true });
}