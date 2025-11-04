// functions/src/utils/jwt.ts
// JWT Utilities – kompatibel & robust (ESM, Node 18, Firebase Functions)

import * as functionsConf from 'firebase-functions/v1';
import jwt, { type JwtPayload, type SignOptions, type Secret } from 'jsonwebtoken';

export type TokenPayload = { userId: string; email?: string } & Record<string, unknown>;

type LoadedCfg = { secret: Secret; expires: string | number };
let _cfg: LoadedCfg | null = null;

/** Lazy Config Load: ENV → functions.config() */
function loadCfg(): LoadedCfg {
  if (_cfg) return _cfg;

  // ENV hat Priorität (z. B. Emulator / .env via emulator:start)
  const envSecret = process.env.JWT_SECRET;
  const envExpires = process.env.JWT_EXPIRES;

  // Firebase functions:config:get (Prod/Staging/Dev)
  const c: any = (functionsConf as any).config?.() ?? {};
  const fxSecret = c?.jwt?.secret as string | undefined;
  const fxExpires = (c?.jwt?.expires as string | number | undefined) ?? '7d';

  const secret = (envSecret ?? fxSecret) as Secret | undefined;
  const expires = (envExpires ?? fxExpires) as string | number;

  if (!secret) {
    throw new Error('JWT secret missing. Configure JWT_SECRET env or functions.config().jwt.secret');
  }

  _cfg = { secret, expires };
  return _cfg!;
}

/** Sign JWT (default HS256) */
export function signJwt(
  payload: TokenPayload,
  expiresIn?: string | number,
  more?: SignOptions
): string {
  const { secret, expires } = loadCfg();
  const exp = expiresIn ?? expires;
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: exp as jwt.SignOptions['expiresIn'],
    ...(more ?? {}),
  });
}

/** Verify JWT */
export function verifyJwt<T extends JwtPayload = JwtPayload>(token: string): T & TokenPayload {
  const { secret } = loadCfg();
  const dec = jwt.verify(token, secret) as T | string;
  if (typeof dec === 'string') throw new Error('Invalid token');
  return dec as T & TokenPayload;
}

/** Optional: nur Claims anschauen (ohne Verify) */
export function decodeJwt<T = unknown>(token: string): (T & TokenPayload) | null {
  const dec = jwt.decode(token);
  if (!dec || typeof dec === 'string') return null;
  return dec as T & TokenPayload;
}

/** Helper für externe Nutzung (z. B. Mails/Debug) */
export function getJwtSecret(): string {
  return String(loadCfg().secret);
}
export function getJwtExpires(): string | number {
  return loadCfg().expires;
}

/* ---- Kompatibilitäts-Aliase (alte Call-Sites) ---- */
export const signToken = signJwt;
export const verifyToken = verifyJwt;