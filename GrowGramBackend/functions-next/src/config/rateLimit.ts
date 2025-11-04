import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { createLogger } from './logger.js';

const log = createLogger({ scope: 'rateLimit' });

export type RateCfg = {
  windowMs?: number;
  max?: number;
  message?: string | object;
};

function keyFromReq(req: any): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'anon'
  );
}

/** Standard-Limiter für API */
export function makeRateLimiter(cfg: RateCfg = {}): RequestHandler {
  const { windowMs = 15 * 60 * 1000, max = 1000, message } = cfg;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFromReq,
    message: message || { error: { code: 'rate_limited', message: 'Too many requests' }, status: 429 },
    handler(req, res, next, options) {
      log.warn('rate limited', { key: keyFromReq(req), path: req.originalUrl });
      res.status(options.statusCode).json(options.message);
    },
  });
}

/** Enger Limiter (z. B. Waitlist) */
export function makeTightLimiter(): RequestHandler {
  return makeRateLimiter({ windowMs: 60 * 1000, max: 10 });
}