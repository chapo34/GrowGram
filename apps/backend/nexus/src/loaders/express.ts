// src/loaders/express.ts
import type { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { initApp, type AppOptions } from '../app/app.js';
import type { OriginRule } from '../app/cors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Erzeugt eine robuste Origin-Whitelist aus ENV + sinnvollen Defaults. */
export function buildAllowedOriginsFromEnv(): OriginRule[] {
  const envList = (process.env.APP_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const base = [
    process.env.APP_BASEURL?.trim(),
    ...envList,
    // lokale Dev-Patterns
    /^http:\/\/localhost(?::\d+)?$/,
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    // Firebase Hosting
    /^https:\/\/.*\.web\.app$/,
    /^https:\/\/.*\.firebaseapp\.com$/,
    // Deine Domain(s)
    'https://growgram-app.com',
    'https://www.growgram-app.com',
  ].filter(Boolean) as OriginRule[];

  // Deduplizieren (Strings)
  const seen = new Set<string>();
  const out: OriginRule[] = [];
  for (const r of base) {
    if (typeof r === 'string') {
      if (seen.has(r)) continue;
      seen.add(r);
    }
    out.push(r);
  }
  return out;
}

export type BuildAppOptions = Partial<AppOptions> & {
  /** Überschreibe die Auto-Origins, falls gewünscht */
  allowedOrigins?: OriginRule[];
};

/** Baut die Express-App mit Security, CORS, Parsern & Routen. */
export async function buildExpressApp(opts: BuildAppOptions = {}): Promise<Express> {
  const allowedOrigins = opts.allowedOrigins ?? buildAllowedOriginsFromEnv();

  const app = await initApp({
    allowedOrigins,
    jsonLimit: process.env.APP_JSON_LIMIT || '2mb',
    urlencodedLimit: process.env.APP_URLENC_LIMIT || '200kb',
    staticDir: path.join(__dirname, '..', 'public'),
    rateLimiter: opts.rateLimiter, // optional extern injizierbar
  });

  return app;
}