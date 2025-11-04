// src/app/app.ts
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from 'express';
import compression from 'compression';
import path from 'path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';

import { buildCors, addPreflight, type OriginRule } from './cors.js';
import { attachSecurity } from './security.js';
import { attachErrorHandlers } from './errors.js';
import { attachDocs } from './docs.js';
import { mountRoutes } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type AppOptions = {
  /** CORS: erlaubte Origins – String, RegExp oder Prüffunktion */
  allowedOrigins?: OriginRule[];
  /** Parser-Limits */
  jsonLimit?: string;
  urlencodedLimit?: string;
  /** Statisches Verzeichnis (optional) – wird nur gemountet, wenn vorhanden */
  staticDir?: string | false;
  /** Optionaler eigener Rate Limiter (z. B. express-rate-limit) */
  rateLimiter?: (req: Request, res: Response, next: NextFunction) => void;
  /** Docs-Konfiguration (Pfad zur openapi.yaml etc.) */
  docs?: {
    yamlPath?: string;
    routeJson?: string;
    routeUi?: string;
    title?: string;
  };
};

/** schlanke Request-Log-Middleware mit Request-ID & Dauer */
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const t0 = process.hrtime.bigint();
  const id = (res.locals.requestId as string) || randomUUID();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);

  const done = () => {
    const ns = Number(process.hrtime.bigint() - t0);
    const ms = Math.round(ns / 1e6);
    res.setHeader('x-response-time', `${ms}ms`);
    // Minimalistisch & strukturiert, damit Logs in Cloud Functions sauber bleiben
    console.log(
      JSON.stringify({
        lvl: 'info',
        id,
        ip: req.ip,
        m: req.method,
        u: req.originalUrl,
        s: res.statusCode,
        ms,
      })
    );
  };

  res.on('finish', done);
  res.on('close', done);
  next();
}

/** App-Factory: Security → CORS → Parser → Static */
export function createApp(opts: AppOptions = {}): Express {
  const {
    allowedOrigins = [],
    jsonLimit = '2mb',
    urlencodedLimit = '200kb',
    staticDir = path.join(__dirname, '..', 'public'),
    rateLimiter,
    docs,
  } = opts;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  // Security / Compression / CORS
  attachSecurity(app);
  app.use(compression() as unknown as RequestHandler);
  app.use(buildCors(allowedOrigins));
  addPreflight(app, allowedOrigins);
  addPreflight(app, allowedOrigins);

  // Request-ID + Logger
  app.use((_, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('x-request-id', res.locals.requestId);
    next();
  });
  app.use(requestLogger);

  // Optionaler Rate-Limiter (von außen injizierbar)
  if (rateLimiter) app.use(rateLimiter);

  // Parser
  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: urlencodedLimit }));

  // Static (nur mounten, wenn vorhanden & nicht explizit deaktiviert)
  if (staticDir && typeof staticDir === 'string' && existsSync(staticDir)) {
    app.use(express.static(staticDir));
  }

  // API-Dokumentation (OpenAPI JSON + Redoc UI)
  attachDocs(app, {
    title: docs?.title ?? 'GrowGram API',
    yamlPath: docs?.yamlPath,   // Standard: src/docs/openapi.yaml
    routeJson: docs?.routeJson, // Standard: /openapi.json
    routeUi: docs?.routeUi,     // Standard: /docs
  });

  return app;
}

/** Vollständiger Bootstrap inkl. Routen & Fehler-Handler. */
export async function initApp(opts: AppOptions = {}): Promise<Express> {
  const app = createApp(opts);
  await mountRoutes(app);
  attachErrorHandlers(app);
  return app;
}