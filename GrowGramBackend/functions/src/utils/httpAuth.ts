// functions/src/utils/httpAuth.ts
import { verifyToken } from './jwtUtils.js';

/** Holt die User-ID aus dem Authorization Header (JWT). */
export function getAuthUid(req: any): string {
  const hdr = String(req.headers?.authorization || '');
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const p: any = verifyToken(token);
  const uid = p.userId || p.uid || p.id;
  if (!uid) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return uid;
}

/** Legacy-Name, falls irgendwo noch `getUserId` benutzt wird. */
export const getUserId = getAuthUid;

/** Variante, die 401 statt Exception vermeidet (z.B. für optionale Endpunkte). */
export function tryGetAuthUid(req: any): string | null {
  try { return getAuthUid(req); } catch { return null; }
}