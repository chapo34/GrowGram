// functions/src/routes/taxonomy.ts
import { Router } from 'express';
import {
  SPECIES_ALIASES,
  FAMILY_ALIASES,
  CANON_TAG_ALIASES,
  STRAIN_ALIASES,
  ALL_SPECIES,
  ALL_FAMILIES,
  ALL_CANON_TAGS,
  ALL_STRAINS,
  type StrainEntry,
} from '../utils/cannabis.js';

const router = Router();

const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

router.get('/taxonomy', (_req, res) => {
  res.json({
    species: ALL_SPECIES,
    families: ALL_FAMILIES,
    tags: ALL_CANON_TAGS,
    strains: ALL_STRAINS, // [{name, family, slug}]
  });
});

router.get('/taxonomy/resolve', (req, res) => {
  const q = norm(String(req.query.q || ''));
  if (!q) return res.json({ species: null, family: null, tag: null, strain: null });

  const species = SPECIES_ALIASES[q] ?? null;
  const family = FAMILY_ALIASES[q] ?? null;
  const tag = CANON_TAG_ALIASES[q] ?? null;

  const strainHit = STRAIN_ALIASES[q];
  const strain = strainHit?.name ?? null;

  return res.json({
    species,
    family: strainHit?.family ?? family ?? null,
    tag,
    strain,
  });
});

router.get('/taxonomy/suggest', (req, res) => {
  const q = norm(String(req.query.q || ''));
  const limit = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 25);
  if (!q) return res.json({ suggestions: [] });

  const bag = new Set<string>();
  for (const s of ALL_SPECIES) if (s.startsWith(q)) bag.add(s);
  for (const f of ALL_FAMILIES) if (f.startsWith(q)) bag.add(f);
  for (const t of ALL_CANON_TAGS) if (t.startsWith(q)) bag.add(t);
  for (const st of (ALL_STRAINS as StrainEntry[]).map((x) => x.slug))
    if (st.startsWith(q)) bag.add(st);

  return res.json({ suggestions: Array.from(bag).slice(0, limit) });
});

export default router;