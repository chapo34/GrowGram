import type { Request, Response } from 'express';
import { db } from '../../config/firebase.js';

export async function searchPosts(req: Request, res: Response) {
  try {
    const { q = '', limit = 20, tag } = (req.query ?? {}) as any;
    const needle = String(q).toLowerCase().trim();

    let snap;
    if (tag) {
      snap = await db.collection('posts').where('visibility', '==', 'public').where('tags', 'array-contains', String(tag)).limit(200).get();
    } else {
      // Firestore hat keine Volltextsuche → simple client-seitige Filterung
      snap = await db.collection('posts').where('visibility', '==', 'public').orderBy('createdAt','desc').limit(200).get();
    }
    const all = snap.docs.map(d => d.data());
    const filtered = needle
      ? all.filter((p: any) => String(p.text || '').toLowerCase().includes(needle) || (Array.isArray(p.tags) && p.tags.join(' ').toLowerCase().includes(needle)))
      : all;

    return res.json({ posts: filtered.slice(0, Number(limit)), nextCursor: null });
  } catch (e: any) {
    console.error('[searchPosts]', e);
    return res.status(500).json({ error: 'internal' });
  }
}