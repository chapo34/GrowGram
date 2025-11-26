// src/middleware/auth/auth.middleware.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../../services/auth/jwt.service.js';

export type AuthOpts = {
  /** Zusätzliche Token-Quellen zulassen (nur wenn wirklich nötig) */
  allowQueryToken?: boolean;         // ?access_token=...
  cookieNames?: string[];            // z.B. ['gg_access','access_token']
  /** Eigene Fehlerantwort (z.B. i18n) */
  onError?: (res: Response, reason: 'missing_token' | 'invalid_token') => void;
};

/** interner Helfer */
function readBearerFromAuthHeader(req: Request): string | undefined {
  const raw = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  if (!raw || typeof raw !== 'string') return;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim();
}

function readFromCookies(req: Request, names: string[]): string | undefined {
  // cookie-parser empfohlen; ohne cookie-parser: req.headers.cookie manuell parsen
  const cookies: Record<string, string> | undefined = (req as any).cookies;
  if (!cookies) return;
  for (const n of names) {
    const v = cookies[n];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
}

/** eigentliche Middleware-Factory */
export function makeAuthRequired(opts: AuthOpts = {}): RequestHandler {
  const cookieNames = opts.cookieNames ?? ['gg_access', 'access_token'];

  return (req: Request, res: Response, next: NextFunction) => {
    // 1) Authorization-Header (präferiert)
    let token = readBearerFromAuthHeader(req);

    // 2) Cookies (optional)
    if (!token) token = readFromCookies(req, cookieNames);

    // 3) Query-Token (nur wenn explizit erlaubt, z. B. für signierte Download-Links)
    if (!token && opts.allowQueryToken) {
      const q = (req.query?.access_token as string | undefined)?.trim();
      if (q) token = q;
    }

    if (!token) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="growgram", error="invalid_request"');
      if (opts.onError) return opts.onError(res, 'missing_token');
      return res.status(401).json({ error: 'unauthorized', reason: 'missing_token' });
    }

    try {
      const payload = verifyAccessToken(token);

      // maximale Kompatibilität für nachgelagerte Handler:
      const userId = (payload as any).userId || (payload as any).sub || (payload as any).id;
      (req as any).user = {
        id: userId,
        userId,
        sub: (payload as any).sub ?? userId,
        email: (payload as any).email,
        role: (payload as any).role || 'user',
      };

      return next();
    } catch {
      res.setHeader('WWW-Authenticate', 'Bearer realm="growgram", error="invalid_token"');
      if (opts.onError) return opts.onError(res, 'invalid_token');
      return res.status(401).json({ error: 'unauthorized', reason: 'invalid_token' });
    }
  };
}

/** Bequemer Default-Handler (backwards-kompatibel zu deinem bisherigen Export) */
export const authRequired: RequestHandler = makeAuthRequired();

/** Optional: erlaubt Aufrufe ohne Token; füllt req.user nur wenn vorhanden */
export function authOptional(opts: Omit<AuthOpts, 'onError'> = {}): RequestHandler {
  const inner = makeAuthRequired(opts);
  return (req, res, next) => {
    // Versuch ohne Fehler – bei Fehler einfach weiter
    try {
      inner(req, res, next);
    } catch {
      next();
    }
  };
}