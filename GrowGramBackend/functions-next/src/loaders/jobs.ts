// src/loaders/jobs.ts
import { reindexPosts, type ReindexStats } from '../jobs/reindex.job.js';
import { backfillThumbnails, type ThumbStats } from '../jobs/thumbnails.job.js';

export type JobName = 'reindex' | 'thumbnails';

export type JobResult =
  | { name: 'reindex'; ok: true; stats: ReindexStats }
  | { name: 'thumbnails'; ok: true; stats: ThumbStats };

/**
 * Führt einen benannten Job aus. Wirft nicht, sondern gibt ok:false bei Fehler zurück,
 * damit Admin-Routen einfache Antworten liefern können.
 */
export async function runJob(name: JobName): Promise<JobResult | { name: JobName; ok: false; error: string }> {
  try {
    if (name === 'reindex') {
      const stats = await reindexPosts();
      return { name, ok: true, stats };
    }
    if (name === 'thumbnails') {
      const stats = await backfillThumbnails();
      return { name, ok: true, stats };
    }
    return { name, ok: false, error: 'unknown_job' };
  } catch (e: any) {
    return { name, ok: false, error: e?.message || String(e) };
  }
}

/**
 * Optionaler Bootstrap aus ENV – standardmäßig NOOP.
 * Setze z. B. JOB_BOOT=reindex oder JOB_BOOT=thumbnails (oder all),
 * wenn du beim Kaltstart einmalig anstoßen willst.
 * Achtung: In Cloud Functions meist NICHT empfohlen → lieber Admin-Route/Crons nutzen.
 */
export async function bootJobsFromEnv(): Promise<void> {
  const mode = (process.env.JOB_BOOT || '').trim().toLowerCase();
  if (!mode) return;

  const doOne = async (n: JobName) => {
    const r = await runJob(n);
    if ('ok' in r && !r.ok) {
      console.warn('[bootJobsFromEnv]', n, 'failed:', r.error);
    } else {
      console.log('[bootJobsFromEnv]', n, 'done.');
    }
  };

  if (mode === 'all') {
    await doOne('reindex');
    await doOne('thumbnails');
  } else if (mode === 'reindex' || mode === 'thumbnails') {
    await doOne(mode);
  }
}