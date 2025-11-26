// backend/nexus/src/jobs/thumbnails.job.ts
import { db } from '../config/firebase.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Ziel: Medien-Backfill/Thumbnails vorbereiten.
 * Ohne zusätzliche Bildbibliotheken generieren wir hier KEINE echten Thumbs,
 * sondern sorgen für konsistente Felder:
 * - mediaUrls[] vorhanden -> thumbs[] auffüllen (z. B. identisch oder CDN-Derivate)
 * - width/height/aspect optional abspeichern, falls Metadaten in Storage vorhanden sind
 * - idempotent, batchweise, mit Locking
 */

export type ThumbStats = {
  scanned: number;
  updated: number;
  skipped: number;
  errors: number;
  batches: number;
  durationMs: number;
};

type LockDoc = {
  owner: string;
  lockedAt: FirebaseFirestore.Timestamp; // Typ
  ttlMs: number;
};

const POSTS_COL = 'posts';
const LOCK_PATH = 'jobs/locks/thumbnails';
const DEFAULT_THUMB_WIDTH = 512;

const storage = getStorage();

/** Firestore-„Lock“. */
async function acquireLock(key: string, ttlMs: number, owner = `thumbs:${Date.now()}`): Promise<boolean> {
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

/** Lock freigeben. */
async function releaseLock(key: string, ownerStartsWith = 'thumbs:'): Promise<void> {
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

/** Konstruiert – wenn sinnvoll – eine "Thumb-URL". */
function deriveThumbUrl(url: string, w = DEFAULT_THUMB_WIDTH): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('w')) u.searchParams.set('w', String(w));
    if (!u.searchParams.has('fit')) u.searchParams.set('fit', 'cover');
    return u.toString();
  } catch {
    return url;
  }
}

/** liest – best effort – Bildmetadaten aus GCS (wenn URL auf GCS-Bucket zeigt) */
async function fetchGcsMetadataIfPossible(url: string): Promise<{ width?: number; height?: number } | null> {
  try {
    // erwarte "gs://<bucket>/<file>" oder "https://storage.googleapis.com/<bucket>/<file>"
    let bucketName = '';
    let filePath = '';

    if (url.startsWith('gs://')) {
      const noScheme = url.slice(5);
      const slash = noScheme.indexOf('/');
      bucketName = noScheme.slice(0, slash);
      filePath = noScheme.slice(slash + 1);
    } else if (url.includes('storage.googleapis.com')) {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      bucketName = parts.shift() || '';
      filePath = decodeURIComponent(parts.join('/'));
    } else {
      return null; // kein GCS
    }

    if (!bucketName || !filePath) return null;
    const file = storage.bucket(bucketName).file(filePath);
    const [meta] = await file.getMetadata();
    const w = meta?.metadata?.width ? Number(meta.metadata.width) : undefined;
    const h = meta?.metadata?.height ? Number(meta.metadata.height) : undefined;
    if (w && h) return { width: w, height: h };
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Füllt fehlende thumbs[]/metadata für Posts mit mediaUrls[].
 * @param pageSize Batchgröße
 * @param maxPages Sicherheitslimit Seiten
 */
export async function backfillThumbnails(pageSize = 200, maxPages = 9999): Promise<ThumbStats> {
  const t0 = Date.now();
  const stats: ThumbStats = { scanned: 0, updated: 0, skipped: 0, errors: 0, batches: 0, durationMs: 0 };

  const locked = await acquireLock(LOCK_PATH, /*ttlMs*/ 10 * 60_000);
  if (!locked) {
    console.warn('[thumbnails] another run is active – skipping');
    return stats;
  }

  try {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let page = 0;

    while (page < maxPages) {
      let q = db.collection(POSTS_COL).orderBy('__name__').limit(pageSize);
      if (cursor) q = q.startAfter(cursor);

      const snap = await q.get();
      if (snap.empty) break;

      let batch = db.batch();
      let ops = 0;

      for (const doc of snap.docs) {
        stats.scanned++;
        cursor = doc;

        try {
          const d = doc.data() as any;
          const mediaUrls: string[] = Array.isArray(d?.mediaUrls) ? d.mediaUrls : [];
          if (mediaUrls.length === 0) {
            stats.skipped++;
            continue;
          }

          const hasThumbs =
            Array.isArray(d?.thumbs) &&
            d.thumbs.length === mediaUrls.length &&
            d.thumbs.every((x: any) => typeof x === 'string' && x.length > 0);

          // Wenn bereits konsistent, überspringen
          if (hasThumbs && d?.meta?.aspect) {
            stats.skipped++;
            continue;
          }

          const thumbs = mediaUrls.map((u) => deriveThumbUrl(u));
          const meta = { ...(d?.meta || {}) };

          // Best effort: Bildmaße über GCS-Metadaten (nur, falls leer)
          if (!meta?.width || !meta?.height) {
            const md = await fetchGcsMetadataIfPossible(mediaUrls[0]);
            if (md?.width && md?.height) {
              meta.width = md.width;
              meta.height = md.height;
              meta.aspect = Number((md.width / md.height).toFixed(5));
            }
          }

          batch.update(doc.ref, {
            thumbs,
            meta,
            thumbsCheckedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          ops++;

          if (ops >= 450) {
            await batch.commit();
            stats.batches++;
            batch = db.batch();
            ops = 0;
          }
        } catch (e) {
          stats.errors++;
          console.error('[thumbnails] doc error', { id: doc.id, err: (e as Error)?.message || e });
        }
      }

      if (ops > 0) {
        await batch.commit();
        stats.batches++;
      }

      page++;
      if (snap.size < pageSize) break;
    }
  } finally {
    await releaseLock(LOCK_PATH);
    stats.durationMs = Date.now() - t0;
    // updated ~ scanned - skipped - errors
    stats.updated = Math.max(0, stats.scanned - stats.skipped - stats.errors);
    console.log('[thumbnails] done', stats);
  }

  return stats;
}