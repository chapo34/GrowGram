// functions/src/routes/adminRoutes.ts
import { Router } from 'express';
import admin from 'firebase-admin';
import {
  SPECIES_ALIASES,
  FAMILY_ALIASES,
  STRAIN_ALIASES,
  ALL_SPECIES,
  ALL_FAMILIES,
  ALL_STRAINS,
} from '../utils/cannabis.js';

// ---- Safe Admin init
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const router = Router();

/* -------------------------------- Helpers -------------------------------- */

function requireAdminToken(req: any) {
  const token = String(req.headers['x-admin-token'] || '');
  if (!token || token !== process.env.ADMIN_TASK_TOKEN) {
    const err: any = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
}

function assertSeedKey(req: any) {
  const seedHeader = String(req.headers['x-seed-key'] || '');
  const adminHeader = String(req.headers['x-admin-token'] || '');
  const seedEnv = String(process.env.SEED_KEY || '');
  const adminEnv = String(process.env.ADMIN_TASK_TOKEN || '');
  // akzeptiert entweder x-seed-key == SEED_KEY ODER x-admin-token == ADMIN_TASK_TOKEN
  if ((seedEnv && seedHeader === seedEnv) || (adminEnv && adminHeader === adminEnv)) return;

  const err: any = new Error('Unauthorized');
  err.status = 401;
  throw err;
}

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
  return normalize(s).split(' ').filter((w) => w.length >= 2 && w.length <= 32);
}

const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));

function sanitizeImageUrl(u: string) {
  try {
    const url = new URL(u);
    url.searchParams.delete('auto');
    url.searchParams.set('fm', 'jpg');
    url.searchParams.set('q', '85');
    url.searchParams.set('w', '1600');
    return url.toString();
  } catch {
    return u;
  }
}

function creditFromUrl(u: string) {
  try {
    const host = new URL(u).hostname;
    if (host.includes('unsplash.com')) {
      return { authorName: '', authorLink: '', photoLink: u, source: 'Unsplash' as const };
    }
    return { authorName: '', authorLink: '', photoLink: u, source: host };
  } catch {
    return { authorName: '', authorLink: '', photoLink: u, source: 'unknown' };
  }
}

/* -------------------------------- Debug ---------------------------------- */

router.get('/ping', (_req, res) =>
  res.json({ ok: true, where: 'adminRoutes', ts: new Date().toISOString() })
);

/* ========================= 1) Reindex Posts ============================== */

router.post('/reindex-posts', async (req, res) => {
  try {
    requireAdminToken(req);

    const limit = Math.min(parseInt(String(req.query.limit || '200'), 10) || 200, 500);
    const afterIso = String(req.query.after || '');
    const after = afterIso ? new Date(afterIso) : null;

    let q: FirebaseFirestore.Query = db.collection('posts').orderBy('createdAt', 'desc');
    if (after && !Number.isNaN(after.getTime())) q = q.startAfter(after);

    const snap = await q.limit(limit).get();
    if (snap.empty) return res.json({ upserted: 0, done: true, nextCursor: null });

    let batch = db.batch();
    let inBatch = 0;
    let upserted = 0;

    for (const d of snap.docs) {
      const v = d.data() as any;
      const text = normalize(v?.text ?? '');
      const tagsRaw: string[] = Array.isArray(v?.tags) ? v.tags : [];
      const tagsLower = tagsRaw.map((t) => normalize(t));

      const words = tokenize(text);
      const keywords = uniq([...words, ...tagsLower]).slice(0, 200);

      const prefixes = new Set<string>();
      for (const w0 of keywords) {
        const w = w0.replace(/^#/, '');
        for (let i = 1; i <= Math.min(w.length, 12); i++) prefixes.add(w.slice(0, i));
      }

      batch.set(
        d.ref,
        {
          keywords,
          keywordPrefixes: Array.from(prefixes).slice(0, 1000),
          tagsLower,
          searchVersion: 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      inBatch++;
      upserted++;

      if (inBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        inBatch = 0;
      }
    }
    if (inBatch > 0) await batch.commit();

    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last?.get('createdAt')
      ? (last.get('createdAt') as FirebaseFirestore.Timestamp).toDate().toISOString()
      : null;

    return res.json({ upserted, done: snap.size < limit, nextCursor });
  } catch (e: any) {
    return res
      .status(e?.status || 500)
      .json({ error: 'reindex_posts_failed', details: String(e?.message || e) });
  }
});

/* ====================== 2) Reindex Suggestions =========================== */

router.post('/reindex-suggestions', async (req, res) => {
  try {
    requireAdminToken(req);

    const snap = await db
      .collection('posts')
      .where('visibility', '==', 'public')
      .orderBy('createdAt', 'desc')
      .limit(2000)
      .get();

    const counts = new Map<string, number>();
    for (const d of snap.docs) {
      const v = d.data() as any;
      const kws: string[] = Array.isArray(v?.keywords) ? v.keywords : [];
      for (const k of kws) if (k) counts.set(k, (counts.get(k) || 0) + 1);
    }

    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 500)
      .map(([term, count]) => ({ term, count }));

    await db.collection('meta').doc('searchTerms').set(
      { updatedAt: admin.firestore.FieldValue.serverTimestamp(), terms: top },
      { merge: true }
    );

    return res.json({ ok: true, count: top.length });
  } catch (e: any) {
    return res
      .status(e?.status || 500)
      .json({ error: 'reindex_suggestions_failed', details: String(e?.message || e) });
  }
});

/* ============= 3) Seed (Unsplash) für Species/Family/Strain ============== */

const SEED_AUTHOR = 'SEEDER_GROWGRAM';

const MUST_WORDS = new Set([
  'cannabis',
  'marijuana',
  'weed',
  'hemp',
  'bud',
  'buds',
  'cola',
  'trichome',
  'trichomes',
  'thc',
  'sativa',
  'indica',
  'hybrid',
  'kush',
  'haze',
  'diesel',
  'skunk',
  'cookies',
  'gelato',
]);

const BAN_WORDS = new Set([
  'papaya',
  'banana',
  'fruit',
  'chestnut',
  'hazelnut',
  'acorn',
  'poppy',
  'opium',
  'tomato',
  'cucumber',
  'pepper',
  'corn',
  'grape',
  'berry',
  'pine',
  'fir',
  'spruce',
  'euphorbia',
]);

function hasCannabisSignal(ph: any, extra: string[] = []) {
  const pool: string[] = [];
  const add = (s?: string) => {
    if (s) pool.push(String(s).toLowerCase());
  };
  add(ph?.description);
  add(ph?.alt_description);
  if (Array.isArray(ph?.tags)) for (const t of ph.tags) add(t?.title);
  pool.push(...extra.map((s) => s.toLowerCase()));
  const text = pool.join(' ');
  if ([...BAN_WORDS].some((b) => text.includes(b))) return false;
  return [...MUST_WORDS].some((w) => text.includes(w));
}

function buildQueries(type: string, term: string): string[] {
  if (type === 'species') {
    return [
      `cannabis ${term}`,
      `${term} cannabis bud`,
      `${term} marijuana plant`,
      `${term} weed macro`,
    ];
  }
  if (type === 'family') {
    const fam = FAMILY_ALIASES[term] || term;
    return [
      `cannabis ${fam}`,
      `${fam} cannabis bud`,
      `${fam} strain cannabis`,
      `"${fam}" marijuana`,
    ];
  }
  if (type === 'strain') {
    return [
      `"${term}" cannabis`,
      `${term} marijuana bud`,
      `${term} weed`,
      `${term} strain cannabis`,
    ];
  }
  return [`cannabis ${term}`];
}

async function seedOneTerm(opts: {
  type: 'species' | 'family' | 'strain';
  term: string;
  rawTerm: string;
  pages: number;
  perPage: number;
  replace: boolean;
}) {
  const ACCESS = process.env.UNSPLASH_ACCESS_KEY;
  if (!ACCESS) throw new Error('UNSPLASH_ACCESS_KEY missing');

  if (opts.replace) {
    let q = db.collection('posts').where('authorId', '==', SEED_AUTHOR);
    q = q.where('tagsLower', 'array-contains', opts.term);
    const old = await q.get();
    if (!old.empty) {
      const delB = db.batch();
      old.forEach((d) => delB.delete(d.ref));
      await delB.commit();
    }
  }

  const queries = buildQueries(opts.type, opts.term);
  const seen = new Set<string>();
  const postsRef = db.collection('posts');
  const now = new Date();
  let written = 0;

  for (const qStr of queries) {
    for (let page = 1; page <= opts.pages; page++) {
      const url = new URL('https://api.unsplash.com/search/photos');
      url.searchParams.set('query', qStr);
      url.searchParams.set('per_page', String(opts.perPage));
      url.searchParams.set('page', String(page));
      url.searchParams.set('order_by', 'relevant');
      url.searchParams.set('content_filter', 'high');
      url.searchParams.set('orientation', 'landscape');
      url.searchParams.set('client_id', ACCESS);

      const r = await (globalThis as any).fetch(url.toString());
      if (!r.ok) throw new Error(`Unsplash ${r.status}: ${await r.text()}`);
      const { results = [] } = await r.json();

      let batch = db.batch();
      let inBatch = 0;

      for (const ph of results) {
        const raw = ph?.urls?.raw || ph?.urls?.regular || ph?.urls?.full;
        if (!raw) continue;
        const img = sanitizeImageUrl(raw);
        if (seen.has(img)) continue;

        const extra = [opts.term, opts.type];
        if (!hasCannabisSignal(ph, extra)) continue;

        seen.add(img);

        const credit = {
          authorName: ph?.user?.name || '',
          authorLink: ph?.user?.links?.html || '',
          photoLink: ph?.links?.html || '',
          source: 'Unsplash',
        };
        const meta = {
          width: ph?.width ?? null,
          height: ph?.height ?? null,
          color: ph?.color ?? null,
          blurhash: ph?.blur_hash ?? null,
        };

        const tags = new Set<string>(['cannabis', 'homegrow', opts.term]);
        if (opts.type === 'strain') {
          const hit = STRAIN_ALIASES[opts.term];
          if (hit?.family) tags.add(hit.family);
        }
        if (opts.type === 'species') tags.add(opts.term);

        const doc = postsRef.doc();
        batch.set(doc, {
          authorId: SEED_AUTHOR,
          text: `${opts.rawTerm} • Cannabis`,
          mediaUrls: [img],
          tags: Array.from(tags),
          credit,
          meta,
          visibility: 'public',
          score: Math.round((0.9 + Math.random() * 0.1) * 100) / 100,
          likesCount: Math.floor(30 + Math.random() * 400),
          commentsCount: Math.floor(Math.random() * 12),
          deleted: false,
          createdAt: now,
          updatedAt: now,
        });

        inBatch++;
        written++;
        if (inBatch >= 400) {
          await batch.commit();
          batch = db.batch();
          inBatch = 0;
        }
      }
      if (inBatch > 0) await batch.commit();
    }
  }
  return { written };
}

router.post('/seed/term-images', async (req, res) => {
  try {
    assertSeedKey(req);
    const type = String(req.body?.type || '').toLowerCase() as 'species' | 'family' | 'strain';
    const rawTerm = String(req.body?.term || '').trim();
    if (!type || !rawTerm) return res.status(400).json({ error: 'type_and_term_required' });
    const term = normalize(rawTerm);

    // optionaler Hinweis: wir validieren, blockieren aber nicht hart
    if (
      (type === 'species' && !SPECIES_ALIASES[term]) ||
      (type === 'family' && !FAMILY_ALIASES[term] && !Object.values(FAMILY_ALIASES).includes(term)) ||
      (type === 'strain' && !STRAIN_ALIASES[term])
    ) {
      // trotzdem versuchen
    }

    const pages = Math.min(parseInt(String(req.body?.pages || '2'), 10) || 2, 5);
    const perPage = Math.min(parseInt(String(req.body?.perPage || '30'), 10) || 30, 30);
    const replace = !!req.body?.replace;

    const { written } = await seedOneTerm({ type, term, rawTerm, pages, perPage, replace });
    return res.json({ ok: true, type, term: rawTerm, written });
  } catch (e: any) {
    return res
      .status(e?.status || 500)
      .json({ error: 'seed_term_images_failed', details: String(e?.message || e) });
  }
});

/* =================== 4) BULK Seed (Unsplash) ============================= */

router.post('/seed/bulk', async (req, res) => {
  try {
    assertSeedKey(req);

    const types = (Array.isArray(req.body?.types) ? req.body.types : ['species', 'family', 'strain']) as Array<
      'species' | 'family' | 'strain'
    >;

    const pages = Math.min(parseInt(String(req.body?.pages || '2'), 10) || 2, 5);
    const perPage = Math.min(parseInt(String(req.body?.perPage || '24'), 10) || 24, 30);
    const replace = !!req.body?.replace;
    const limitTerms = Math.min(parseInt(String(req.body?.limitTerms || '20'), 10) || 20, 60);
    const offset = Math.max(parseInt(String(req.body?.offset || '0'), 10) || 0, 0);

    const pool: Array<{ type: 'species' | 'family' | 'strain'; term: string; raw: string }> = [];

    if (types.includes('species')) {
      for (const s of ALL_SPECIES) pool.push({ type: 'species', term: normalize(s), raw: s });
    }
    if (types.includes('family')) {
      for (const f of ALL_FAMILIES) pool.push({ type: 'family', term: normalize(f), raw: f });
    }
    if (types.includes('strain')) {
      for (const st of ALL_STRAINS) {
        pool.push({ type: 'strain', term: normalize(st.slug), raw: st.name });
      }
    }

    const slice = pool.slice(offset, offset + limitTerms);
    let written = 0;
    for (const item of slice) {
      const r = await seedOneTerm({
        type: item.type,
        term: item.term,
        rawTerm: item.raw,
        pages,
        perPage,
        replace,
      });
      written += r.written;
    }

    return res.json({
      ok: true,
      processed: slice.length,
      written,
      nextOffset: offset + slice.length < pool.length ? offset + slice.length : null,
      totalTerms: pool.length,
    });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ error: 'seed_bulk_failed', details: String(e?.message || e) });
  }
});

/* =================== 5) Utility: Unsplash / wipe ========================= */

router.post('/seed/unsplash', async (req, res) => {
  try {
    assertSeedKey(req);
    const { urls = [], topic = 'Homegrow • Cannabis Community 🌿', replace = false } = req.body || {};
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ message: 'Bitte urls[] mitgeben.' });
    }
    const postsRef = db.collection('posts');
    if (replace) {
      const old = await postsRef.where('authorId', '==', SEED_AUTHOR).get();
      const delBatch = db.batch();
      old.forEach((d) => delBatch.delete(d.ref));
      await delBatch.commit();
    }
    const now = new Date();
    const batch = db.batch();
    for (const raw of urls) {
      const url = sanitizeImageUrl(String(raw));
      const credit = creditFromUrl(url);
      const doc = postsRef.doc();
      batch.set(doc, {
        authorId: SEED_AUTHOR,
        text: topic,
        mediaUrls: [url],
        tags: ['cannabis', 'homegrow'],
        credit,
        visibility: 'public',
        score: Math.round((0.85 + Math.random() * 0.15) * 100) / 100,
        likesCount: Math.floor(30 + Math.random() * 400),
        commentsCount: Math.floor(Math.random() * 12),
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();
    return res.json({ ok: true, count: urls.length });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ message: 'seed_unsplash_failed', details: String(e?.message || e) });
  }
});

router.post('/seed/unsplash-query', async (req, res) => {
  try {
    assertSeedKey(req);
    const ACCESS = process.env.UNSPLASH_ACCESS_KEY;
    if (!ACCESS) return res.status(500).json({ message: 'UNSPLASH_ACCESS_KEY fehlt' });

    const {
      topics = ['cannabis homegrow', 'cannabis grow tent'],
      perTopic = 25,
      pages = 2,
      topicLabel = 'Homegrow • Cannabis Community 🌿',
      replace = false,
      banWords = ['banana', 'fruit', 'food'],
      requireLandscape = true,
    } = req.body || {};

    const postsRef = db.collection('posts');
    if (replace) {
      const old = await postsRef.where('authorId', '==', SEED_AUTHOR).get();
      const delBatch = db.batch();
      old.forEach((d) => delBatch.delete(d.ref));
      await delBatch.commit();
    }

    const seen = new Set<string>();
    let total = 0;
    const now = new Date();

    for (const q of topics) {
      for (let page = 1; page <= pages; page++) {
        const url = new URL('https://api.unsplash.com/search/photos');
        url.searchParams.set('query', q);
        url.searchParams.set('per_page', String(perTopic));
        url.searchParams.set('page', String(page));
        url.searchParams.set('order_by', 'relevant');
        url.searchParams.set('content_filter', 'high');
        if (requireLandscape) url.searchParams.set('orientation', 'landscape');
        url.searchParams.set('client_id', ACCESS);

        const r = await (globalThis as any).fetch(url.toString());
        if (!r.ok) throw new Error(`Unsplash ${r.status}: ${await r.text()}`);
        const json: any = await r.json();
        const results: any[] = json.results || [];
        if (!results.length) continue;

        let batch = db.batch();
        let inBatch = 0;

        for (const ph of results) {
          const desc = `${ph?.alt_description || ''} ${ph?.description || ''}`.toLowerCase();
          if ((banWords as string[]).some((w) => desc.includes(w))) continue;

          const raw = (ph?.urls?.raw || ph?.urls?.regular || ph?.urls?.full) as string | undefined;
          if (!raw) continue;
          const img = sanitizeImageUrl(raw);
          if (seen.has(img)) continue;
          seen.add(img);

          const meta = {
            width: ph?.width ?? null,
            height: ph?.height ?? null,
            color: ph?.color ?? null,
            blurhash: ph?.blur_hash ?? null,
          };

          const credit = {
            authorName: ph?.user?.name || '',
            authorLink: ph?.user?.links?.html || '',
            photoLink: ph?.links?.html || '',
            source: 'Unsplash',
          };

          const doc = postsRef.doc();
          batch.set(doc, {
            authorId: SEED_AUTHOR,
            text: topicLabel,
            mediaUrls: [img],
            tags: ['cannabis', 'homegrow'],
            credit,
            meta,
            visibility: 'public',
            score: Math.round((0.85 + Math.random() * 0.15) * 100) / 100,
            likesCount: Math.floor(30 + Math.random() * 400),
            commentsCount: Math.floor(Math.random() * 12),
            deleted: false,
            createdAt: now,
            updatedAt: now,
          });
          total++;
          inBatch++;
          if (inBatch >= 400) {
            await batch.commit();
            batch = db.batch();
            inBatch = 0;
          }
        }
        if (inBatch > 0) await batch.commit();
      }
    }

    return res.json({ ok: true, count: total });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ message: 'seed_unsplash_query_failed', details: String(e?.message || e) });
  }
});

router.post('/wipe/seed', async (req, res) => {
  try {
    assertSeedKey(req);
    const snap = await db.collection('posts').where('authorId', '==', SEED_AUTHOR).get();
    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return res.json({ ok: true, deleted: snap.size });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ message: 'wipe_seed_failed', details: String(e?.message || e) });
  }
});

/* =================== 6) Neueste N Posts taggen =========================== */

router.post('/add-tag', async (req, res) => {
  try {
    requireAdminToken(req);
    const tag = String(req.query.tag || '').toLowerCase().trim();
    const count = Math.min(parseInt(String(req.query.count || '50'), 10) || 50, 200);
    if (!tag) return res.status(400).json({ error: 'tag_required' });

    const snap = await db
      .collection('posts')
      .where('visibility', '==', 'public')
      .orderBy('createdAt', 'desc')
      .limit(count)
      .get();

    const batch = db.batch();
    for (const d of snap.docs) {
      const v = d.data() as any;
      const tags: string[] = Array.isArray(v.tags) ? v.tags : [];
      if (!tags.map((t) => t.toLowerCase()).includes(tag)) {
        batch.update(d.ref, { tags: [...tags, tag] });
      }
    }
    await batch.commit();

    return res.json({ ok: true, updated: snap.size, tag });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ error: 'add_tag_failed', details: String(e?.message || e) });
  }
});

/* =========== 7) Zusätzliche Quellen: Pexels & Pixabay ==================== */

const PEXELS_BASE = 'https://api.pexels.com/v1/search';
const PIXABAY_BASE = 'https://pixabay.com/api/';

function textHasCannabisSignal(...pieces: (string | undefined)[]) {
  const text = pieces.filter(Boolean).map((s) => String(s).toLowerCase()).join(' ');
  if ([...BAN_WORDS].some((b) => text.includes(b))) return false;
  return [...MUST_WORDS].some((w) => text.includes(w));
}

// PEXELS
router.post('/seed/pexels-term', async (req, res) => {
  try {
    assertSeedKey(req);
    const type = String(req.body?.type || 'species').toLowerCase() as 'species' | 'family' | 'strain';
    const rawTerm = String(req.body?.term || '').trim();
    if (!rawTerm) return res.status(400).json({ error: 'term_required' });
    const term = normalize(rawTerm);
    const pages = Math.min(parseInt(String(req.body?.pages || '2'), 10) || 2, 5);
    const perPage = Math.min(parseInt(String(req.body?.perPage || '24'), 10) || 24, 30);
    const replace = !!req.body?.replace;

    const KEY = process.env.PEXELS_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'PEXELS_API_KEY missing' });

    if (replace) {
      const old = await db
        .collection('posts')
        .where('authorId', '==', SEED_AUTHOR)
        .where('tagsLower', 'array-contains', term)
        .get();
      if (!old.empty) {
        const b = db.batch();
        old.forEach((d) => b.delete(d.ref));
        await b.commit();
      }
    }

    const queries = buildQueries(type, term).map((q) => `${q} macro trichomes`);
    const seen = new Set<string>();
    const postsRef = db.collection('posts');
    const now = new Date();
    let written = 0;

    for (const q of queries) {
      for (let page = 1; page <= pages; page++) {
        const url = new URL(PEXELS_BASE);
        url.searchParams.set('query', q);
        url.searchParams.set('per_page', String(perPage));
        url.searchParams.set('page', String(page));
        url.searchParams.set('orientation', 'landscape');
        url.searchParams.set('size', 'large');

        const r = await (globalThis as any).fetch(url.toString(), { headers: { Authorization: KEY } });
        if (!r.ok) throw new Error(`Pexels ${r.status}: ${await r.text()}`);
        const json: any = await r.json();
        const photos: any[] = json?.photos || [];
        if (!photos.length) continue;

        let batch = db.batch();
        let inBatch = 0;
        for (const ph of photos) {
          const raw = ph?.src?.original || ph?.src?.large2x || ph?.src?.large;
          if (!raw) continue;
          const img = sanitizeImageUrl(raw);
          if (seen.has(img)) continue;
          if (!textHasCannabisSignal(ph?.alt, rawTerm, type)) continue;

          seen.add(img);
          const tags = new Set<string>(['cannabis', 'homegrow', term]);
          if (type === 'strain') {
            const hit = STRAIN_ALIASES[term];
            if (hit?.family) tags.add(hit.family);
          }

          const doc = postsRef.doc();
          batch.set(doc, {
            authorId: SEED_AUTHOR,
            text: `${rawTerm} • Cannabis`,
            mediaUrls: [img],
            tags: Array.from(tags),
            credit: {
              authorName: ph?.photographer || '',
              authorLink: ph?.photographer_url || '',
              photoLink: ph?.url || '',
              source: 'Pexels',
              license: 'Pexels License',
            },
            meta: { width: ph?.width ?? null, height: ph?.height ?? null, color: null, blurhash: null },
            visibility: 'public',
            score: Math.round((0.9 + Math.random() * 0.1) * 100) / 100,
            likesCount: Math.floor(50 + Math.random() * 300),
            commentsCount: Math.floor(Math.random() * 8),
            deleted: false,
            createdAt: now,
            updatedAt: now,
          });
          inBatch++;
          written++;
          if (inBatch >= 400) {
            await batch.commit();
            batch = db.batch();
            inBatch = 0;
          }
        }
        if (inBatch > 0) await batch.commit();
      }
    }
    return res.json({ ok: true, type, term: rawTerm, written });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ error: 'seed_pexels_failed', details: String(e?.message || e) });
  }
});

// PIXABAY
router.post('/seed/pixabay-term', async (req, res) => {
  try {
    assertSeedKey(req);
    const type = String(req.body?.type || 'species').toLowerCase() as 'species' | 'family' | 'strain';
    const rawTerm = String(req.body?.term || '').trim();
    if (!rawTerm) return res.status(400).json({ error: 'term_required' });
    const term = normalize(rawTerm);
    const pages = Math.min(parseInt(String(req.body?.pages || '2'), 10) || 2, 5);
    const perPage = Math.min(parseInt(String(req.body?.perPage || '24'), 10) || 24, 30);
    const replace = !!req.body?.replace;

    const KEY = process.env.PIXABAY_API_KEY;
    if (!KEY) return res.status(500).json({ error: 'PIXABAY_API_KEY missing' });

    if (replace) {
      const old = await db
        .collection('posts')
        .where('authorId', '==', SEED_AUTHOR)
        .where('tagsLower', 'array-contains', term)
        .get();
      if (!old.empty) {
        const b = db.batch();
        old.forEach((d) => b.delete(d.ref));
        await b.commit();
      }
    }

    const queries = buildQueries(type, term).map((q) => `${q} trichomes`);
    const seen = new Set<string>();
    const postsRef = db.collection('posts');
    const now = new Date();
    let written = 0;

    for (const q of queries) {
      for (let page = 1; page <= pages; page++) {
        const url = new URL(PIXABAY_BASE);
        url.searchParams.set('key', KEY);
        url.searchParams.set('q', q);
        url.searchParams.set('image_type', 'photo');
        url.searchParams.set('orientation', 'horizontal');
        url.searchParams.set('safesearch', 'true');
        url.searchParams.set('min_width', '1600');
        url.searchParams.set('per_page', String(perPage));
        url.searchParams.set('page', String(page));

        const r = await (globalThis as any).fetch(url.toString());
        if (!r.ok) throw new Error(`Pixabay ${r.status}: ${await r.text()}`);
        const json: any = await r.json();
        const hits: any[] = json?.hits || [];
        if (!hits.length) continue;

        let batch = db.batch();
        let inBatch = 0;
        for (const ph of hits) {
          const raw = ph?.largeImageURL || ph?.webformatURL;
          if (!raw) continue;
          if (seen.has(raw)) continue;
          if (!textHasCannabisSignal(ph?.tags, q, rawTerm, type)) continue;

          seen.add(raw);
          const tags = new Set<string>(['cannabis', 'homegrow', term]);
          if (type === 'strain') {
            const hit = STRAIN_ALIASES[term];
            if (hit?.family) tags.add(hit.family);
          }

          const doc = postsRef.doc();
          batch.set(doc, {
            authorId: SEED_AUTHOR,
            text: `${rawTerm} • Cannabis`,
            mediaUrls: [raw],
            tags: Array.from(tags),
            credit: {
              authorName: ph?.user || '',
              authorLink: ph?.pageURL || '',
              photoLink: ph?.pageURL || '',
              source: 'Pixabay',
              license: 'Pixabay License',
            },
            meta: { width: ph?.imageWidth ?? null, height: ph?.imageHeight ?? null, color: null, blurhash: null },
            visibility: 'public',
            score: Math.round((0.9 + Math.random() * 0.1) * 100) / 100,
            likesCount: Math.floor(40 + Math.random() * 250),
            commentsCount: Math.floor(Math.random() * 6),
            deleted: false,
            createdAt: now,
            updatedAt: now,
          });
          inBatch++;
          written++;
          if (inBatch >= 400) {
            await batch.commit();
            batch = db.batch();
            inBatch = 0;
          }
        }
        if (inBatch > 0) await batch.commit();
      }
    }
    return res.json({ ok: true, type, term: rawTerm, written });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ error: 'seed_pixabay_failed', details: String(e?.message || e) });
  }
});

export default router;