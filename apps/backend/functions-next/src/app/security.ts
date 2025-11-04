// src/app/security.ts
import type { Express } from 'express';
import helmet from 'helmet';

export function attachSecurity(app: Express): void {
  app.use(helmet({
    // In Functions/Uploads oft nötig:
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    dnsPrefetchControl: { allow: true },
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 15552000, includeSubDomains: true, preload: false }
      : false,
  }));

  // Zusätzliche, unkritische Hardening-Header
  app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
}

export default attachSecurity;