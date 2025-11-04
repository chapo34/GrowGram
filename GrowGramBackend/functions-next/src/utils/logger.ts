type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function envLevel(): Level {
  const raw = String(process.env.LOG_LEVEL || 'info').toLowerCase() as Level;
  return (ORDER[raw] ? raw : 'info');
}

export function logger(scope?: string) {
  const min = envLevel();
  const minN = ORDER[min];

  const base = (lvl: Level, msg: string, meta?: Record<string, unknown>) => {
    if (ORDER[lvl] < minN) return;
    const payload = {
      ts: new Date().toISOString(),
      lvl,
      scope,
      msg,
      ...(meta && Object.keys(meta).length ? { meta } : {}),
    };
    const line = JSON.stringify(payload);
    // route to console
    if (lvl === 'error') console.error(line);
    else if (lvl === 'warn') console.warn(line);
    else console.log(line);
  };

  return {
    debug: (m: string, meta?: Record<string, unknown>) => base('debug', m, meta),
    info:  (m: string, meta?: Record<string, unknown>) => base('info', m, meta),
    warn:  (m: string, meta?: Record<string, unknown>) => base('warn', m, meta),
    error: (m: string, meta?: Record<string, unknown>) => base('error', m, meta),
  };
}

export const log = logger('app');