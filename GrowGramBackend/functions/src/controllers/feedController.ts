// src/controllers/feedController.ts
import type { Request, Response } from 'express';
import { db } from '../config/firebase.js';

// Helper
const mapDoc = (d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() });

const isIndexError = (err: any) =>
  err?.code === 9 || String(err?.message || '').includes('requires an index');

/**
 * GET /feed/trending?limit=20&cursor=<docId>&tag=<string>
 * - score DESC
 * - optionaler Tag-Filter
 * - Cursor-Pagination
 */
export async function getTrending(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursorId = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const tag = typeof req.query.tag === 'string' && req.query.tag.trim() ? req.query.tag.trim() : undefined;

  try {
    let q: FirebaseFirestore.Query = db
      .collection('posts')
      .where('visibility', '==', 'public')
      .where('deleted', '==', false);

    if (tag) q = q.where('tagsLower', 'array-contains', tag.toLowerCase());

    q = q.orderBy('score', 'desc').orderBy('createdAt', 'desc').limit(limit);

    if (cursorId) {
      const cur = await db.collection('posts').doc(cursorId).get();
      if (cur.exists) q = q.startAfter(cur);
    }

    const snap = await q.get();
    const posts = snap.docs.map(mapDoc);
    const nextCursor = snap.size === limit ? snap.docs[snap.docs.length - 1].id : null;

    return res.status(200).json({ posts, nextCursor });
  } catch (err: any) {
    if (isIndexError(err)) {
      // Fallback bis Composite-Index erstellt wurde
      let q: FirebaseFirestore.Query = db
        .collection('posts')
        .where('visibility', '==', 'public');

      if (tag) q = q.where('tagsLower', 'array-contains', tag.toLowerCase());

      q = q.orderBy('createdAt', 'desc').limit(limit * 2);

      if (cursorId) {
        const cur = await db.collection('posts').doc(cursorId).get();
        if (cur.exists) q = q.startAfter(cur);
      }

      const snap = await q.get();
      const rawDocs = snap.docs;
      const posts = rawDocs.map(mapDoc).filter((p: any) => !p.deleted).slice(0, limit);
      const nextCursor = rawDocs.length === limit * 2 ? rawDocs[rawDocs.length - 1].id : null;

      return res.status(200).json({ posts, nextCursor, mode: 'fallback' });
    }

    console.error('[feed] trending error:', err);
    return res.status(500).json({ message: 'feed_trending_failed', details: String(err?.message || err) });
  }
}

/** GET /feed/for-you – einfache chronologische Liste */
export async function getForYou(_req: Request, res: Response) {
  try {
    const snap = await db
      .collection('posts')
      .where('visibility', '==', 'public')
      .where('deleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const posts = snap.docs.map(mapDoc);
    return res.status(200).json({ posts, nextCursor: null });
  } catch (err: any) {
    console.error('[feed] for-you error:', err);
    return res.status(500).json({ message: 'feed_foryou_failed', details: String(err?.message || err) });
  }
}

/** GET /feed/trending-tags?limit=16 – zählt häufige Tags */
export async function getTrendingTags(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 16, 50);

  try {
    const snap = await db
      .collection('posts')
      .where('visibility', '==', 'public')
      .where('deleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    const counts = new Map<string, number>();
    for (const d of snap.docs) {
      const tags: string[] = (d.get('tagsLower') || d.get('tags') || []) as string[];
      for (const t of tags) {
        const key = String(t).trim().toLowerCase();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    return res.status(200).json({ tags });
  } catch (err: any) {
    console.error('[feed] trending-tags error:', err);
    return res.status(500).json({ message: 'feed_trending_tags_failed', details: String(err?.message || err) });
  }
}