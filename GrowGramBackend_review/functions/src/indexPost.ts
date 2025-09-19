// functions/src/indexPost.ts
import * as functions from 'firebase-functions/v1';
import admin from 'firebase-admin';
import {
  SPECIES_ALIASES,
  FAMILY_ALIASES,
  CANON_TAG_ALIASES,
  STRAIN_ALIASES,
} from './utils/cannabis.js';

if (!admin.apps.length) admin.initializeApp();

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
  return s.split(' ').map(w => w.trim()).filter(w => w.length >= 2 && w.length <= 32);
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

// n-Grams (für mehrwortige Strains wie „amnesia haze“)
function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

export const indexPost = functions
  .region('europe-west3')
  .firestore.document('posts/{postId}')
  .onWrite(async (chg) => {
    const before = chg.before.exists ? (chg.before.data() as any) : null;
    const after  = chg.after.exists  ? (chg.after.data()  as any) : null;
    if (!after) return;

    const textBefore = normalize(before?.text ?? '');
    const textAfter  = normalize(after?.text ?? '');
    const tagsBefore = (Array.isArray(before?.tags) ? before.tags : []).map((t: string) => normalize(t));
    const tagsAfter  = (Array.isArray(after?.tags)  ? after.tags  : []).map((t: string) => normalize(t));

    const sameText = textBefore === textAfter;
    const sameTags = tagsBefore.length === tagsAfter.length && tagsBefore.every((t: string, i: number) => t === tagsAfter[i]);
    if (before && sameText && sameTags) return;

// ---------- Grund-Token ----------
const words = tokenize(textAfter);
const baseKeywords = uniq([...words, ...tagsAfter]);

// >>> PATCH: Hashtags (#sativa) in „nackte“ Tokens umwandeln
const wordsNoHash = words.map(w => w.replace(/^#/, ''));

// ---------- Taxonomie ableiten ----------
const species   = new Set<string>();
const families  = new Set<string>();
const strains   = new Set<string>();
const canonTags = new Set<string>(); // z.B. cali/indoor/outdoor/hydro …

// 1) Einzelwörter/Hashtags
for (const raw of uniq([...wordsNoHash, ...tagsAfter])) {   // <<< hier wordsNoHash
  const w = raw.replace(/^#/, '');
  const sp = SPECIES_ALIASES[w];   if (sp) species.add(sp);
  const fa = FAMILY_ALIASES[w];    if (fa) families.add(fa);
  const ct = CANON_TAG_ALIASES[w]; if (ct) canonTags.add(ct);
}

// 2) Mehrwortige Strains (3-grams, 2-grams) – mit hash-bereinigten Tokens
const grams = [
  ...ngrams(wordsNoHash, 3),
  ...ngrams(wordsNoHash, 2),
];
for (const g of grams) {
  const hit = STRAIN_ALIASES[g];
  if (hit) {
    strains.add(hit.name);
    if (hit.family) families.add(hit.family);
  }
}
    // 3) Abgeleitete Tags (kommen mit in tagsLower/keywords)
    const derivedTags = uniq([
      ...Array.from(species),
      ...Array.from(families),
      ...Array.from(canonTags),
      // Strains packen wir in keywords (exakt) – wer will, kann sie auch als Tag führen:
      // ...Array.from(strains).map(s => normalize(s)), // optional
    ]);

    // ---------- keywords / prefixes ----------
    const keywords = uniq([
      ...baseKeywords,
      ...derivedTags,
      ...Array.from(strains).map(s => normalize(s)),  // Strains exakt suchbar machen
    ]).slice(0, 300);

    const keywordPrefixes = makePrefixes(keywords, 12).slice(0, 1000);

    // ---------- tagsLower ----------
    const tagsLower = uniq([
      ...tagsAfter,
      ...derivedTags,
    ]).slice(0, 100);

    await chg.after.ref.set({
      keywords,
      keywordPrefixes,
      tagsLower,
      canna: {
        species: Array.from(species),     // ['sativa'] | ['indica','ruderalis'] …
        families: Array.from(families),   // ['haze','kush'] …
        strains: Array.from(strains),     // ['Amnesia Haze','OG Kush'] …
      },
      searchVersion: 2,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });