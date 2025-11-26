import type { Request, Response } from 'express';

export async function listTags(_req: Request, res: Response) {
  return res.json({ tags: [] });
}
export async function listStrains(_req: Request, res: Response) {
  return res.json({ strains: [] });
}