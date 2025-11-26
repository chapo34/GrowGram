import { LOG_LEVEL } from "./env.js";

type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Mindestlevel anhand LOG_LEVEL
const MIN = order[LOG_LEVEL as Level] ?? 20;

function stamp() {
  return new Date().toISOString();
}

function write(level: Level, scope: string | undefined, ...args: unknown[]) {
  if (order[level] < MIN) return;
  const prefix = `[${stamp()}] [${level.toUpperCase()}]${scope ? ` [${scope}]` : ""}`;
  if (level === "warn") return console.warn(prefix, ...args);
  if (level === "error") return console.error(prefix, ...args);
  return console.log(prefix, ...args); // info + debug
}

/** Fabrik: Logger mit optionalem Scope-Tag (z. B. 'rateLimit') */
export function createLogger(opts?: { scope?: string }) {
  const scope = opts?.scope;
  return {
    debug: (...a: unknown[]) => write("debug", scope, ...a),
    info:  (...a: unknown[]) => write("info",  scope, ...a),
    warn:  (...a: unknown[]) => write("warn",  scope, ...a),
    error: (...a: unknown[]) => write("error", scope, ...a),
  };
}

/** Globaler Default-Logger ohne Scope */
export const logger = createLogger();

export default logger;