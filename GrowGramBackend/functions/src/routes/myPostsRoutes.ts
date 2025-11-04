// functions/src/routes/myPostsRoutes.ts
import { Router } from 'express';
import { db, admin } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = Router();

function uidFromReq(req: any): string {
  const hdr = String(req.headers.authorization || '');
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const p: any = verifyToken(token);
  const uid = p.userId || p.uid || p.id;
  if (!uid) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return uid;
}

function encCursor(ms: number, id: string) {
  return Buffer.from(JSON.stringify({ ms, id }), 'utf8').toString('base64url');
}
function decCursor(s?: string | null): { ms: number; id: string } | null {
  if (!s) return null;
  try { return JSON.parse(Buffer.from(String(s), 'base64url').toString('utf8')); }
  catch { return null; }
}

/**
 * GET /posts/mine?limit=24&cursor=<b64>
 * → { posts: [...], nextCursor: string|null }
 */
router.get('/mine', async (req, res) => {
  try {
    const uid = uidFromReq(req);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '24'), 10) || 24));
    const cur = decCursor(req.query.cursor as string | undefined);

    let q: FirebaseFirestore.Query = db
      .collection('posts')
      .where('authorId', '==', uid)
      .where('deleted', '==', false)
      .orderBy('createdAt', 'desc')
      .orderBy(admin.firestore.FieldPath.documentId(), 'desc')
      .limit(limit + 1);

    if (cur?.ms && cur?.id) {
      const ts = admin.firestore.Timestamp.fromMillis(cur.ms);
      q = q.startAfter(ts, cur.id);
    }

    const snap = await q.get();
    const docs = snap.docs.slice(0, limit);

    const posts = docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        text: x.text || '',
        mediaUrls: Array.isArray(x.mediaUrls) ? x.mediaUrls : [],
        tags: Array.isArray(x.tags) ? x.tags : [],
        likesCount: x.likesCount || 0,
        commentsCount: x.commentsCount || 0,
        visibility: x.visibility || 'public',
        createdAt: x.createdAt?.toMillis?.() ?? null,
      };
    });

    let nextCursor: string | null = null;
    if (snap.docs.length > limit) {
      const last = docs[docs.length - 1];
      const ms = (last.get('createdAt')?.toMillis?.() as number) ?? Date.now();
      nextCursor = encCursor(ms, last.id);
    }

    return res.json({ posts, nextCursor });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'mine_failed', details: String(e?.message || e) });
  }
});

export default router;