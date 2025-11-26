import type { Request, Response } from 'express';

export async function listByPost(_req: Request, res: Response) {
  return res.json({ comments: [], nextCursor: null });
}

export async function createForPost(_req: Request, res: Response) {
  return res.json({ comment: { id: 'c1', text: '' } });
}

export async function likeComment(_req: Request, res: Response) {
  return res.status(204).end();
}

export async function unlikeComment(_req: Request, res: Response) {
  return res.status(204).end();
}