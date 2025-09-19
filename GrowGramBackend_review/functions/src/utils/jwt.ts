// Schlanke JWT-Helpers (optional)
import functions from 'firebase-functions';
import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions, Secret } from 'jsonwebtoken';

const cfg: any = (functions as any).config ? (functions as any).config() : {};
const RAW: Secret | undefined =
  (process.env.JWT_SECRET as Secret | undefined) ?? (cfg?.jwt?.secret as Secret | undefined);
if (!RAW) throw new Error('JWT_SECRET nicht konfiguriert (ENV oder functions.config().jwt.secret)');
const SECRET = RAW as Secret;
const DEFAULT_EXP: string | number =
  (process.env.JWT_EXPIRES as any) ?? (cfg?.jwt?.expires as any) ?? '7d';

export type TokenPayload = { userId: string; email?: string };

export function signJwt(payload: TokenPayload, expiresIn?: string | number, more?: SignOptions): string {
  const exp = (expiresIn ?? DEFAULT_EXP) as any;
  return jwt.sign(payload as Record<string, unknown>, SECRET, { expiresIn: exp, ...(more ?? {}) });
}

export function verifyJwt<T extends JwtPayload = JwtPayload>(token: string): T & TokenPayload {
  const dec = jwt.verify(token, SECRET) as T | string;
  if (typeof dec === 'string') throw new Error('Invalid token');
  return dec as T & TokenPayload;
}

export function getJwtSecret(): string { return String(SECRET); }
export function getJwtExpires(): string | number { return DEFAULT_EXP; }