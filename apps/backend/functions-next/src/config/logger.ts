import { ENV } from './env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = order[ENV.LOG_LEVEL] ?? 20;

type Base = { lvl: Level; msg?: string; [k: string]: any };

function out(lvl: Level, payload: Base) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
    lvl,
  });
  // eslint-disable-next-line no-console
  (lvl === 'error' ? console.error : lvl === 'warn' ? console.warn : console.log)(line);
}

export function createLogger(ctx?: Record<string, any>) {
  const withCtx = (extra?: Record<string, any>) => ({ ...(ctx || {}), ...(extra || {}) });

  return {
    debug(msg: string, extra?: Record<string, any>) {
      if (order.debug < MIN) return;
      out('debug', { msg, ...withCtx(extra), lvl: 'debug' });
    },
    info(msg: string, extra?: Record<string, any>) {
      if (order.info < MIN) return;
      out('info', { msg, ...withCtx(extra), lvl: 'info' });
    },
    warn(msg: string, extra?: Record<string, any>) {
      if (order.warn < MIN) return;
      out('warn', { msg, ...withCtx(extra), lvl: 'warn' });
    },
    error(err: unknown, extra?: Record<string, any>) {
      const e = err instanceof Error ? { msg: err.message, stack: err.stack } : { msg: String(err) };
      out('error', { ...e, ...withCtx(extra), lvl: 'error' });
    },
    child(extraCtx: Record<string, any>) {
      return createLogger({ ...(ctx || {}), ...(extraCtx || {}) });
    },
  };
}

export const log = createLogger();