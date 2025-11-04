import type { Request, Response } from 'express';

export async function verifyEmail(_req: Request, res: Response) {
  // TODO: Token prüfen & User verifizieren
  return res.json({ ok: true });
}