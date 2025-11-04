import type { Request, Response } from 'express';

export async function uploadBinaryCreatePost(_req: Request, res: Response) {
  return res.json({ post: { id: 'p-bin-1' } });
}