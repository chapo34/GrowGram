// src/controllers/feed/trendingController.ts
//
// GET /api/feed/trending
// - optional: ?limit=20&cursor=<postId>&tag=<tag>
// - benutzt AgeGate → filtert Posts nach AgeTier (U16 / 16+ / 18+)
//
// Router-Kette (empfohlen):
//   attachAgeTier → trendingFeed

import type { Request, Response } from 'express';
import { db } from '../../config/firebase.js';
import {
  isPostVisibleForAgeTier,
  type AgeTier,
  type PostAgeMeta,
} from '../../utils/ageGate.js';

type AgeAwareReq = Request & {
  ageTier?: AgeTier;
};

export async function trendingFeed(req: AgeAwareReq, res: Response) {
  try {
    // 1) Query-Parameter
    const rawLimit = Number(req.query.limit ?? '20');
    const limit = Number.isFinite(rawLimit)
      ? Math.max(5, Math.min(50, rawLimit))
      : 20;

    const cursorId = (req.query.cursor as string | undefined) || undefined;
    const tag = (req.query.tag as string | undefined) || undefined;

    const postsCol = db.collection('posts');

    // 2) Basis-Query: nur sichtbare, nicht gelöschte Public-Posts
    let q: FirebaseFirestore.Query = postsCol
      .where('visibility', '==', 'public')
      .where('removed', '==', false)
      .where('flagged', '==', false);

    // Optional: nach Tag filtern (Array-contains)
    if (tag) {
      q = q.where('tags', 'array-contains', tag);
    }

    // Score-basiert, dann Fallback createdAt
    q = q.orderBy('score', 'desc').orderBy('createdAt', 'desc').limit(limit);

    // Cursor: wir benutzen das Post-Dokument (id) als Startpunkt
    if (cursorId) {
      const cursorSnap = await postsCol.doc(cursorId).get();
      if (cursorSnap.exists) {
        q = q.startAfter(cursorSnap);
      }
    }

    // 3) Firestore laden
    const snap = await q.get();
    const docs = snap.docs;

    let items = docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
      };
    });

    // 4) Age-Gate anwenden (Backend-Seite)
    const tier: AgeTier = req.ageTier ?? 'UNKNOWN';

    items = items.filter((post) => {
      const ageMeta: PostAgeMeta =
        (post.age as PostAgeMeta | undefined) ?? {
          minAge: 16,
          adultOnly: false,
          audience: 'ALL',
          tags: post.tags ?? [],
        };

      return isPostVisibleForAgeTier(ageMeta, tier);
    });

    // 5) Nächster Cursor
    const nextCursor = docs.length === limit ? docs[docs.length - 1].id : null;

    return res.status(200).json({
      ok: true,
      items,
      nextCursor,
      ageTier: tier,
    });
  } catch (err) {
    console.error('[trendingFeed] failed:', err);
    return res.status(500).json({ error: 'internal' });
  }
}