/** Führende/trailing Spaces weg + Mehrfach-Whitespace auf eins. */
export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Umlaute/Diakritika entfernen (für Search/Slug). */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Slugify: lowercase, diacritics weg, nicht-alphanumerisch → '-'. */
export function slugify(s: string): string {
  const base = stripDiacritics(s).toLowerCase();
  return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Für Volltextsuche: lowercased, diacritics entfernt, kompakt. */
export function toSearchable(...parts: (string | undefined | null)[]): string {
  const joined = parts.filter(Boolean).join(' ');
  return normalizeWhitespace(stripDiacritics(joined)).toLowerCase();
}

/** Tags in ein sauberes Set normalisieren. */
export function normalizeTags(input: string[] | string | undefined | null): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : input.split(/[,#\s]+/g);
  const out = new Set<string>();
  for (const raw of arr) {
    const t = slugify(raw);
    if (t) out.add(t);
  }
  return [...out];
}