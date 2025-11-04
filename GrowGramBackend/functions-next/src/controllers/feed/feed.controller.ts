import type { Request, Response } from 'express';

// Platzhalter-Services
async function serviceTrending(_opts: any) { return { items: [], nextCursor: null }; }
async function serviceForYou(_opts: any)   { return { items: [], nextCursor: null }; }
async function serviceTrendingTags(_n: number) { return ['grow', 'cannabis', 'tips']; }

export async function trending(req: Request, res: Response) {
  const { limit, cursor, tag } = (req as any).query || {};
  const data = await serviceTrending({ limit: Number(limit) || 20, cursor: String(cursor || ''), tag: tag ? String(tag) : undefined });
  return res.json(data);
}
export async function forYou(req: Request, res: Response) {
  const { limit, cursor } = (req as any).query || {};
  const data = await serviceForYou({ userId: (req as any).user?.id ?? 'me', limit: Number(limit) || 20, cursor: String(cursor || '') });
  return res.json(data);
}
export async function searchPosts(_req: Request, res: Response) { return res.json({ items: [], nextCursor: null }); }

export async function trendingTags(_req: Request, res: Response) {
  const tags = await serviceTrendingTags(20);
  return res.json({ tags });
}