// functions/src/utils/waitlistPublic.ts
import { randomBytes, createHash } from 'node:crypto';

/**
 * Öffentliche, kurze ID für die Warteliste, z.B. "GG-ML9KJQ-8F2A"
 * - Kollisionssicher genug für Public-IDs (kein Sicherheits-Secret)
 */
export function newPublicId(prefix = 'GG'): string {
  // 6 random bytes → 8 Base64URL-Zeichen, uppercased
  const rnd = randomBytes(6).toString('base64url').toUpperCase(); // z.B. "ML9KJQ"
  const ts = Date.now().toString(36).toUpperCase();               // Zeitstempel kompakt
  return `${prefix}-${rnd}-${ts}`;                                // "GG-ML9KJQ-MF2A1H"
}

/**
 * Viewer-Token für persönliche Status-Ansicht (später nur als Hash speichern!)
 * - Zufälliger Token (kein JWT), ausreichend lang
 */
export function newViewerToken(byteLen = 24): string {
  return randomBytes(byteLen).toString('base64url'); // z.B. ~32–34 Zeichen
}

/**
 * SHA-256 Hash eines Tokens, zur sicheren Ablage in Firestore.
 * - Token selbst nie im Klartext speichern
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}