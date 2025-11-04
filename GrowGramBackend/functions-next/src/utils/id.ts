import { randomUUID, randomBytes } from 'node:crypto';

/** Krypto-sichere, URL-freundliche ID (default 22 Zeichen). */
export function shortId(len = 22): string {
  // Base64url ohne Padding
  const b = randomBytes(Math.ceil((len * 3) / 4))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return b.slice(0, len);
}

/** UUID v4 ohne Bindestriche. */
export function uuid(): string {
  return randomUUID().replace(/-/g, '');
}

/** Zeitbasierte ID (Millis + Random) – gut sortierbar. */
export function ksid(): string {
  const t = Date.now().toString(36);
  const r = shortId(10);
  return `${t}_${r}`;
}