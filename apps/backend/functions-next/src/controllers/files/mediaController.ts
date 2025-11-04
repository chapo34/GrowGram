import type { Request, Response } from 'express';

export async function redirectSignedDownload(_req: Request, res: Response) {
  // TODO: signierte URL erzeugen und redirecten
  return res.status(404).json({ error: { code: 'not_found' } });
}