// src/core/utils/img.ts

/**
 * Hängt einen einfachen Cache-Buster an eine Bild-URL an.
 * Beispiel: bustCache("https://x.jpg", 123) → "https://x.jpg?t=123"
 */
export function bustCache(u: string, bust?: number | string): string {
  if (!u) return u;
  const sep = u.includes('?') ? '&' : '?';
  const v = bust ?? Date.now();
  return `${u}${sep}t=${v}`;
}