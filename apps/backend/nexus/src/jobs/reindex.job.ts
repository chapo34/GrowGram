// backend/nexus/src/jobs/reindex.job.ts
import { db } from '../config/firebase.js';
import { FieldValue, FieldPath, Timestamp } from 'firebase-admin/firestore';

/**
 * Ziel: Suchfelder/Normalisierung für Posts pflegen.
 * - idempotent: kann beliebig oft laufen
 * - batchweise: <=500 Mutationen/Batch
 * - locking: Firestore-basiert, um parallele Läufe zu verhindern
 */

export type ReindexStats = {
  scanned: number;
  updated: number;
  skipped: number;
  errors: number;
  batches: number;
  durationMs: number;
};

type LockDoc = {
  owner: string;
  lockedAt: FirebaseFirestore.Timestamp; // Typ (kein Value)
  ttlMs: number;
};

const POSTS_COL = 'posts';
const LOCK_PATH = 'jobs/locks/reindexPosts';

/** Firestore-„Lock“. Gibt true zurück, wenn Lock erworben wurde. */
async function acquireLock(key: string, ttlMs: number, owner = `reindex:${Date.now()}`): Promise<boolean> {
  const ref = db.doc(key);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Timestamp.now();

      if (snap.exists) {
        const data = snap.data() as LockDoc;
        const age = now.toMillis() - data.lockedAt.toMillis();
        if (age < (data.ttlMs ?? ttlMs)) {
          throw new Error('LOCKED');
        }
      }
      tx.set(ref, { owner, lockedAt: now, ttlMs }, { merge: true });
    });
    return true;
  } catch (e: any) {
    if (e?.message === 'LOCKED') return false;
    throw e;
  }
}

/** Lock freigeben (best effort). */
async function releaseLock(key: string, ownerStartsWith = 'reindex:'): Promise<void> {
  const ref = db.doc(key);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() as LockDoc;
      if (String(data.owner || '').startsWith(ownerStartsWith)) {
        tx.delete(ref);
      }
    });
  } catch {
    /* noop */
  }
}

/** normale Tokenizer/Normalizer für Volltext/TAG-Suche */
function normalizeText(t: string): string {
  return (t || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(tags.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)));
}

function keywordsFrom(text: string, tags: string[]): string[] {
  const base = normalizeText(text).split(/\s+/).filter((w) => w.length >= 2 && w.length <= 32);
  return Array.from(new Set([...base, ...tags]));
}

/**
 * Reindiziert die posts-Collection.
 * @param pageSize Größe pro Firestore-Seite (Default 250)
 * @param maxPages Sicherheitslimit (Default 9999)
 */
export async function reindexPosts(pageSize = 250, maxPages = 9999): Promise<ReindexStats> {
  const t0 = Date.now();
  const stats: ReindexStats = { scanned: 0, updated: 0, skipped: 0, errors: 0, batches: 0, durationMs: 0 };

  const locked = await acquireLock(LOCK_PATH, /*ttlMs*/ 10 * 60_000);
  if (!locked) {
    console.warn('[reindexPosts] another run is active – skipping');
    return stats;
  }

  try {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let page = 0;

    while (page < maxPages) {
      let q = db.collection(POSTS_COL).orderBy(FieldPath.documentId()).limit(pageSize);
      if (cursor) q = q.startAfter(cursor);

      const snap = await q.get();
      if (snap.empty) break;

      // Batch vorbereiten
      let batch = db.batch();
      let batchOps = 0;

      for (const doc of snap.docs) {
        stats.scanned++;
        cursor = doc;

        try {
          const d = doc.data() as any;
          const text = String(d?.text || '');
          const tags = normalizeTags(d?.tags);
          const textLc = normalizeText(text);
          const kws = keywordsFrom(textLc, tags);

          const existsSame =
            d?.search?.text_lc === textLc &&
            Array.isArray(d?.search?.tags) &&
            d.search.tags.join('|') === tags.join('|') &&
            Array.isArray(d?.search?.keywords) &&
            d.search.keywords.join('|') === kws.join('|');

          if (existsSame) {
            stats.skipped++;
            continue;
          }

          batch.update(doc.ref, {
            search: { text_lc: textLc, tags, keywords: kws, updatedAt: FieldValue.serverTimestamp() },
            updatedAt: FieldValue.serverTimestamp(),
          });
          batchOps++;

          if (batchOps >= 450) {
            await batch.commit();
            stats.batches++;
            batch = db.batch();
            batchOps = 0;
          }
        } catch (e) {
          stats.errors++;
          console.error('[reindexPosts] doc error', { id: doc.id, err: (e as Error)?.message || e });
        }
      }

      if (batchOps > 0) {
        await batch.commit();
        stats.batches++;
      }

      page++;
      if (snap.size < pageSize) break; // letzte Seite
    }
  } finally {
    await releaseLock(LOCK_PATH);
    stats.durationMs = Date.now() - t0;
  }

  stats.updated = Math.max(0, stats.scanned - stats.skipped - stats.errors);
  return stats;
}