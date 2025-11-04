import type { Express } from 'express';
import cors, { type CorsOptions } from 'cors';

export type OriginRule = string | RegExp | ((origin: string) => boolean);

function isAllowed(origin: string, rules: OriginRule[]): boolean {
  for (const r of rules) {
    if (typeof r === 'string' && r === origin) return true;
    if (r instanceof RegExp && r.test(origin)) return true;
    if (typeof r === 'function' && r(origin)) return true;
  }
  return false;
}

/** CORS mit Whitelist/RegEx/Funktion + klare Fehlerkennung. */
export function buildCors(allowedOrigins: OriginRule[]) {
  const opts: CorsOptions = {
    origin(origin, cb) {
      if (!origin) return cb(null, true); // z.B. curl/healthchecks
      if (isAllowed(origin, allowedOrigins)) return cb(null, true);

      const err = new Error('CORS: origin not allowed');
      // @ts-ignore – wir markieren das bewusst
      err.name = 'CorsError';
      return cb(err as any, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Location'],
  };
  return cors(opts);
}

/** Schnelle, gecachte Preflight-Antwort für alle Pfade. */
export function addPreflight(app: Express, allowedOrigins: OriginRule[]) {
  app.options('*', (req, res) => {
    const origin = req.get('Origin') || '';
    res.setHeader('Vary', 'Origin');

    if (!origin || isAllowed(origin, allowedOrigins)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    return res.status(403).end();
  });
}