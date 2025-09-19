// functions/src/routes/search.ts
import { Router } from 'express';
import admin from 'firebase-admin';
import {
  SPECIES_ALIASES,
  FAMILY_ALIASES,
  CANON_TAG_ALIASES,
  STRAIN_ALIASES,
} from '../utils/cannabis.js';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

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
  return s.split(' ').map(w => w.trim()).filter(w => w.length >= 1 && w.length <= 32);
}
// n-grams für mehrwortige Strains
const ngrams = (toks: string[], n: number) => {
  const out: string[] = [];
  for (let i = 0; i <= toks.length - n; i++) out.push(toks.slice(i, i + n).join(' '));
  return out;
};

// Query → { strain | tag | free }
function resolveQuery(qRaw: string): { kind: 'strain'|'tag'|'free'; value?: string } {
  const q = normalize(qRaw);
  const toks = tokenize(q).map(t => t.replace(/^#/, '')); // #sativa → sativa

  // 1) Strain (3-gram → 2-gram → 1-gram)
  for (const g of [...ngrams(toks, 3), ...ngrams(toks, 2), ...toks]) {
    const hit = STRAIN_ALIASES[g];
    if (hit) return { kind: 'strain', value: normalize(hit.name) };
  }

  // 2) Species
  if (toks.length === 1 && SPECIES_ALIASES[toks[0]]) {
    return { kind: 'tag', value: SPECIES_ALIASES[toks[0]] };
  }

  // 3) Family
  if (toks.length === 1 && FAMILY_ALIASES[toks[0]]) {
    return { kind: 'tag', value: FAMILY_ALIASES[toks[0]] };
  }

  // 4) Canonical Tags (indoor/outdoor/hydro/cali/…)
  if (toks.length === 1 && CANON_TAG_ALIASES[toks[0]]) {
    return { kind: 'tag', value: CANON_TAG_ALIASES[toks[0]] };
  }

  return { kind: 'free' };
}

const router = Router();

/**
 * GET /feed/search?q=...&limit=20&cursor=<ISO>
 * - Strain  → keywords array-contains (exakt, normalisiert)
 * - Tag     → tagsLower array-contains (species/family/canonical)
 * - Free    → erst keywords (exact), dann keywordPrefixes (prefix)
 */
router.get('/search', async (req, res) => {
  try {
    const qRaw = String(req.query.q || '');
    const q = normalize(qRaw);
    if (!q) return res.json({ posts: [], nextCursor: null });

    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
    const cursor = String(req.query.cursor || '');
    const forcedTag = String(req.query.tag || '').trim().toLowerCase();

    const base = () =>
      db.collection('posts')
        .where('visibility', '==', 'public')
        .orderBy('createdAt', 'desc');

    const applyCursor = (qr: FirebaseFirestore.Query) => {
      if (!cursor) return qr;
      const dt = new Date(cursor);
      return Number.isNaN(dt.getTime()) ? qr : qr.startAfter(dt);
    };

    const r = resolveQuery(qRaw);
    let snap: FirebaseFirestore.QuerySnapshot;

    if (r.kind === 'strain' && r.value) {
      let qr = base().where('keywords', 'array-contains', r.value);
      if (forcedTag) qr = qr.where('tagsLower', 'array-contains', forcedTag);
      snap = await applyCursor(qr).limit(limit + 1).get();
    } else if (r.kind === 'tag' && r.value) {
      let qr = base().where('tagsLower', 'array-contains', r.value);
      snap = await applyCursor(qr).limit(limit + 1).get();
    } else {
      // frei: erst exact, dann prefix
      const tryExact = async () => {
        let qr = base().where('keywords', 'array-contains', q);
        if (forcedTag) qr = qr.where('tagsLower', 'array-contains', forcedTag);
        return applyCursor(qr).limit(limit + 1).get();
      };
      const tryPrefix = async () => {
        const first = tokenize(q)[0] || q;
        let qr = base().where('keywordPrefixes', 'array-contains', first);
        if (forcedTag) qr = qr.where('tagsLower', 'array-contains', forcedTag);
        return applyCursor(qr).limit(limit + 1).get();
      };
      const s1 = await tryExact();
      snap = s1.empty ? await tryPrefix() : s1;
    }

    const docs = snap.docs;
    const items = docs.slice(0, limit).map(d => ({ id: d.id, ...(d.data() as any) }));
    const last = docs.length > limit ? docs[limit - 1] : docs[docs.length - 1];
    const nextCursor = last?.get('createdAt')
      ? (last.get('createdAt') as FirebaseFirestore.Timestamp).toDate().toISOString()
      : null;

    return res.json({
      posts: items.map(v => ({
        id: v.id,
        text: v.text ?? '',
        mediaUrls: v.mediaUrls ?? [],
        tags: v.tags ?? [],
        likesCount: v.likesCount ?? 0,
        commentsCount: v.commentsCount ?? 0,
        createdAt: v.createdAt ?? null,
        visibility: v.visibility ?? 'public',
      })),
      nextCursor: nextCursor || null,
    });
  } catch (err) {
    console.error('GET /feed/search error', err);
    return res.status(500).json({ error: 'search_failed' });
  }
});

/** GET /feed/search/suggestions?q=…&limit=8 (unverändert) */
router.get('/search/suggestions', async (req, res) => {
  try {
    const q = normalize(String(req.query.q || ''));
    if (!q) return res.json({ suggestions: [] });

    const snap = await db
      .collection('posts')
      .where('visibility', '==', 'public')
      .where('keywordPrefixes', 'array-contains', q)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const bag = new Set<string>();
    for (const d of snap.docs) {
      const v = d.data() as any;
      const kws: string[] = Array.isArray(v.keywords) ? v.keywords : [];
      for (const k of kws) {
        if (k && k.startsWith(q)) bag.add(k);
        if (bag.size >= 20) break;
      }
      if (bag.size >= 20) break;
    }
    const suggestions = Array.from(bag).slice(0, Number(req.query.limit) || 8);
    return res.json({ suggestions });
  } catch (err) {
    console.error('GET /feed/search/suggestions error', err);
    return res.status(500).json({ suggestions: [] });
  }
});

export default router;