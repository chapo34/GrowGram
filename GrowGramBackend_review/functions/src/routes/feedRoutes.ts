import { Router } from 'express';
import admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

type FireTS = FirebaseFirestore.Timestamp;

function toPlainPost(d: FirebaseFirestore.QueryDocumentSnapshot) {
  const v = d.data() as any;
  return {
    id: d.id,
    text: v.text ?? '',
    mediaUrls: Array.isArray(v.mediaUrls) ? v.mediaUrls : [],
    tags: Array.isArray(v.tags) ? v.tags : [],
    likesCount: Number(v.likesCount ?? 0),
    commentsCount: Number(v.commentsCount ?? 0),
    score: typeof v.score === 'number' ? v.score : 0,
    createdAt: v.createdAt ?? null,
    visibility: v.visibility ?? 'public',
  };
}

function encodeCursor(score: number, createdAt: FireTS | Date) {
  const iso = createdAt instanceof Date ? createdAt.toISOString() : createdAt.toDate().toISOString();
  return Buffer.from(JSON.stringify({ s: score || 0, t: iso })).toString('base64url');
}
function decodeCursor(cur?: string | null): { s: number; t: Date } | null {
  if (!cur) return null;
  try {
    const o = JSON.parse(Buffer.from(String(cur), 'base64url').toString('utf8'));
    const t = new Date(o.t);
    if (Number.isNaN(t.getTime())) return null;
    return { s: Number(o.s) || 0, t };
  } catch {
    const d = new Date(cur);
    if (!Number.isNaN(d.getTime())) return { s: 0, t: d };
    return null;
  }
}

const router = Router();

/**
 * GET /feed/trending?limit=20&cursor=<base64>&tag=<optional>
 * Filtern: visibility == 'public'
 * Sortierung: score DESC, createdAt DESC
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
    const tagRaw = String(req.query.tag || '').trim();
    const tag = tagRaw ? tagRaw.toLowerCase() : '';
    const cur = decodeCursor(String(req.query.cursor || '') || null);

    let q: FirebaseFirestore.Query = db
      .collection('posts')
      .where('visibility', '==', 'public')
      .orderBy('score', 'desc')
      .orderBy('createdAt', 'desc');

    if (tag) q = q.where('tagsLower', 'array-contains', tag);
    if (cur) q = q.startAfter(cur.s, cur.t);

    const snap = await q.limit(limit + 1).get();
    const docs = snap.docs;

    const posts = docs.slice(0, limit).map(toPlainPost);

    let nextCursor: string | null = null;
    const lastDoc = docs.length > limit ? docs[limit - 1] : docs[docs.length - 1];
    if (lastDoc) {
      const v = lastDoc.data() as any;
      const s = typeof v.score === 'number' ? v.score : 0;
      const t = (v.createdAt as FireTS) ?? null;
      if (t) nextCursor = encodeCursor(s, t);
    }

    res.json({ posts, nextCursor });
  } catch (err) {
    console.error('GET /feed/trending error:', err);
    res.status(500).json({ posts: [], nextCursor: null, error: 'trending_failed' });
  }
});

/**
 * GET /feed/trending-tags?limit=16
 * Nimmt die letzten ~200 öffentlichen Posts und zählt Tags.
 */
router.get('/trending-tags', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '16'), 10) || 16, 50);

    const snap = await db
      .collection('posts')
      .where('visibility', '==', 'public')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const counts = new Map<string, number>();
    for (const d of snap.docs) {
      const v = d.data() as any;
      const tags: string[] = Array.isArray(v.tagsLower)
        ? v.tagsLower
        : Array.isArray(v.tags)
        ? v.tags.map((t: string) => String(t || '').toLowerCase())
        : [];
      for (const t of tags) {
        if (!t) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }

    const tags = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ tags });
  } catch (err) {
    console.error('GET /feed/trending-tags error:', err);
    res.status(500).json({ tags: [] });
  }
});

export default router;