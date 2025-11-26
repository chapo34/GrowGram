import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');

export const hmacSha256Hex = (key: string, data: string) =>
  createHmac('sha256', key).update(data).digest('hex');

export const randomHex = (bytes = 16) => randomBytes(bytes).toString('hex');

export function safeEqual(a: string, b: string): boolean {
  try {
    const abuf = Buffer.from(a);
    const bbuf = Buffer.from(b);
    if (abuf.length !== bbuf.length) return false;
    return timingSafeEqual(abuf, bbuf);
  } catch {
    return false;
  }
}