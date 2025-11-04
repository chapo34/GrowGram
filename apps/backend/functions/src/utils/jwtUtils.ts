// functions/src/utils/jwtUtils.ts
// Einheitliche Secret-Quelle: zuerst functions.config(), dann .env
import * as functionsConf from 'firebase-functions/v1';
import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions, Secret } from 'jsonwebtoken';

function pick<T>(...vals: (T | undefined)[]): T | undefined {
  return vals.find((v) => v !== undefined) as T | undefined;
}

function getConfig() {
  const c: any = (functionsConf as any).config?.() ?? {};
  return {
    jwtSecret: pick<Secret>(
      c?.jwt?.secret as Secret | undefined,
      process.env.JWT_SECRET as Secret | undefined
    ),
    authExpires:
      (pick<string | number>(c?.jwt?.expires as any, process.env.JWT_EXPIRES as any) ??
        '7d') as string | number,
    resetExpires:
      (pick<string | number>(c?.reset?.expires as any, process.env.RESET_EXPIRES as any) ??
        '60m') as string | number,
  };
}

const cfg = getConfig();
if (!cfg.jwtSecret) {
  throw new Error('[jwtUtils] Missing JWT secret (set functions:config().jwt.secret or JWT_SECRET)');
}

export interface AuthTokenPayload extends JwtPayload {
  userId: string;
  email?: string;
}
export interface ResetTokenPayload extends JwtPayload {
  userId: string;
  purpose: 'reset';
  jti: string;
}
export type AuthTokenInput = { userId: string; email?: string; expiresIn?: string | number };

function signOpts(expires: string | number, more?: SignOptions): SignOptions {
  return { expiresIn: expires as any, algorithm: 'HS256', ...(more ?? {}) };
}

export function generateToken(payload: AuthTokenInput, more?: SignOptions): string {
  const { expiresIn, ...claims } = payload;
  const exp = expiresIn ?? cfg.authExpires;
  return jwt.sign(claims as Record<string, unknown>, cfg.jwtSecret as Secret, signOpts(exp, more));
}

export function verifyToken<T extends JwtPayload = AuthTokenPayload>(token: string): T {
  const dec = jwt.verify(token, cfg.jwtSecret as Secret, {
    algorithms: ['HS256'],
    clockTolerance: 60, // 60s Toleranz gegen Uhr-Drift
  }) as T | string;
  if (typeof dec === 'string') throw new Error('Invalid token');
  return dec;
}

export function generateResetToken(
  payload: { userId: string } & Partial<Omit<ResetTokenPayload, 'purpose' | 'userId' | 'jti'>>,
  more?: SignOptions
): string {
  const base: Record<string, unknown> = { ...payload, userId: payload.userId, purpose: 'reset' };
  return jwt.sign(base, cfg.jwtSecret as Secret, {
    ...signOpts(cfg.resetExpires, more),
    jwtid:
      (globalThis.crypto?.randomUUID?.() as string) ??
      (Math.random().toString(36).slice(2) + Date.now().toString(36)),
  });
}

export function verifyResetToken(token: string): ResetTokenPayload {
  const dec = jwt.verify(token, cfg.jwtSecret as Secret, {
    algorithms: ['HS256'],
    clockTolerance: 60,
  }) as ResetTokenPayload | string;
  if (typeof dec === 'string' || dec.purpose !== 'reset' || !dec.jti) {
    throw new Error('Invalid reset token');
  }
  return dec;
}

export function decodeUnsafe<T = any>(token: string): T | null {
  const d = jwt.decode(token) as T | null;
  return d ?? null;
}