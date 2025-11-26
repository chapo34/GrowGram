import type { Request, Response } from 'express';

export async function uploadAvatar(_req: Request, res: Response) {
  // TODO: Upload speichern
  return res.json({ ok: true });
}

// Alias für Routes, die uploadAvatarBinary erwarten
export { uploadAvatar as uploadAvatarBinary };