// functions/src/jobs/reindex.ts
import * as functions from 'firebase-functions/v1';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

/* ---- Helpers ----------------------------------------------------------- */
function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokenize(s: string): string[] {
  if (!s) return [];
  return s
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && w.length <= 32);
}
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
function makePrefixes(words: string[], maxLen = 12): string[] {
  const out = new Set<string>();
  for (const w0 of words) {
    const w = w0.replace(/^#/, '');
    for (let i = 1; i <= Math.min(w.length, maxLen); i++) out.add(w.slice(0, i));
  }
  return Array.from(out);
}

/**
 * POST /reindexPosts
 * Header: Authorization: Bearer <ADMIN_JOB_SECRET>
 * Schreibt keywords, keywordPrefixes, tagsLower, searchVersion für ALLE bestehenden Posts.
 */
export const reindexPosts = functions
  .region('europe-west3')
  .https.onRequest(async (req, res) => {
    try {
      const secret = process.env.ADMIN_JOB_SECRET;
      const auth = String(req.headers.authorization || '');

      if (req.method !== 'POST' || !secret || auth !== `Bearer ${secret}`) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const batchSize = 300;
      let lastDoc: QueryDocumentSnapshot | null = null;
      let total = 0;

      // paginiert über die gesamte posts-Collection
      // (setzt voraus, dass 'createdAt' existiert)
      // wenn dir das fehlt, ersetze das orderBy z.B. durch '__name__'
      // und passe das startAfter entsprechend an.
      for (;;) {
        let q = db.collection('posts').orderBy('createdAt', 'desc').limit(batchSize);
        if (lastDoc) q = q.startAfter(lastDoc);

        const snap = await q.get();
        if (snap.empty) break;

        const batch = db.batch();

        for (const doc of snap.docs) {
          const v = doc.data() as any;
          const text = normalize(v.text ?? '');
          const tagsLower = Array.isArray(v.tags) ? v.tags.map((t: string) => normalize(t)) : [];

          const keywords = uniq([...tokenize(text), ...tagsLower]).slice(0, 200);
          const keywordPrefixes = makePrefixes(keywords, 12).slice(0, 1000);

          batch.set(
            doc.ref,
            {
              keywords,
              keywordPrefixes,
              tagsLower,
              searchVersion: 1,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        await batch.commit();
        total += snap.size;
        lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      }
      res.json({ ok: true, updated: total });
      return;
    } catch (err) {
      console.error('reindexPosts error', err);
      res.status(500).json({ error: 'reindex_failed' });
      return;
    }
  });