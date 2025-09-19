// Zentrale JWT-Utilities – ENV bevorzugt, dann functions.config()
// Kompatibel zu generateToken({ userId, email, expiresIn })
import functions from 'firebase-functions';
import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions, Secret } from 'jsonwebtoken';

const cfg: any = (functions as any).config ? (functions as any).config() : {};

function pick<T>(...vals: (T | undefined)[]): T | undefined {
  return vals.find(v => v !== undefined) as T | undefined;
}

const SECRET_OPT: Secret | undefined =
  pick<Secret>(process.env.JWT_SECRET as Secret | undefined, cfg?.jwt?.secret as Secret | undefined);
if (!SECRET_OPT) throw new Error('JWT_SECRET nicht konfiguriert (ENV oder functions.config().jwt.secret)');
const SECRET = SECRET_OPT as Secret;

const AUTH_EXPIRES: string | number =
  pick<string | number>(process.env.JWT_EXPIRES as any, cfg?.jwt?.expires as any) ?? '7d';

const RESET_EXPIRES: string | number =
  pick<string | number>(process.env.RESET_EXPIRES as any, cfg?.reset?.expires as any) ?? '15m';

export interface AuthTokenPayload extends JwtPayload { userId: string; email?: string }
export interface ResetTokenPayload extends JwtPayload { userId: string; purpose: 'reset' }
export type AuthTokenInput = { userId: string; email?: string; expiresIn?: string | number };

function opts(expires: string | number, more?: SignOptions): SignOptions {
  return { expiresIn: expires as any, ...(more ?? {}) };
}

export function generateToken(payload: AuthTokenInput, more?: SignOptions): string {
  const { expiresIn, ...claims } = payload;
  const exp = expiresIn ?? AUTH_EXPIRES;
  return jwt.sign(claims as Record<string, unknown>, SECRET, opts(exp, more));
}

export function verifyToken<T extends JwtPayload = AuthTokenPayload>(token: string): T {
  const dec = jwt.verify(token, SECRET) as T | string;
  if (typeof dec === 'string') throw new Error('Invalid token');
  return dec;
}

export function generateResetToken(
  payload: { userId: string } & Partial<Omit<ResetTokenPayload, 'purpose' | 'userId'>>,
  more?: SignOptions
): string {
  const p: ResetTokenPayload = { ...payload, purpose: 'reset', userId: payload.userId };
  return jwt.sign(p as unknown as Record<string, unknown>, SECRET, opts(RESET_EXPIRES, more));
}

export function verifyResetToken(token: string): ResetTokenPayload {
  const dec = jwt.verify(token, SECRET) as ResetTokenPayload | string;
  if (typeof dec === 'string' || dec.purpose !== 'reset') throw new Error('Invalid reset token');
  return dec;
}