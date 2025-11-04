/** Entfernt Steuerzeichen, Zero-Width usw. */
export function stripControlChars(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2060\uFEFF]/g, '');
}

/** Sehr konservative Text-Sanitization für einfache Felder. */
export function sanitizeText(
  s: string,
  opts: { maxLen?: number; allowNewlines?: boolean } = {}
): string {
  const { maxLen = 2000, allowNewlines = true } = opts;
  let out = stripControlChars(s);
  if (!allowNewlines) out = out.replace(/\r?\n+/g, ' ');
  out = out.replace(/\s+/g, ' ').trim();
  if (out.length > maxLen) out = out.slice(0, maxLen);
  return out;
}

/** Safe JSON parse mit Default */
export function safeJson<T = unknown>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/** Kleine Helfer */
export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
export const toInt = (v: unknown, def = 0) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : def;
};
export const toBool = (v: unknown, def = false) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return /^(1|true|yes|on)$/i.test(v);
  if (typeof v === 'number') return v !== 0;
  return def;
};