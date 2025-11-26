import express from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import { buildCors, addPreflight, type OriginRule } from "./cors.js";
// ⬇️ NEU: zentraler Auth-Router
import authRouter from "../routes/auth/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type AppOptions = {
  allowedOrigins?: OriginRule[];
  jsonLimit?: string;
  urlencodedLimit?: string | number;
  staticDir?: string;
  rateLimiter?: ReturnType<typeof rateLimit> | { windowMs: number; max: number };
  enableCompression?: boolean;   // default: true
  trustProxy?: boolean;          // default: true
};

export function initApp(opts: AppOptions = {}): express.Express {
  const app = express();

  const allowedOrigins =
    (opts.allowedOrigins && opts.allowedOrigins.length ? opts.allowedOrigins : [
      "http://localhost:19006",
      process.env.APP_BASEURL || "",
      `https://${process.env.GCLOUD_PROJECT || ""}.web.app`,
      // optional: Frontend-Site explizit
      process.env.FRONTEND_HOST || "" // z.B. https://growgram2025-230c0.web.app
    ]).filter(Boolean) as OriginRule[];

  if (opts.trustProxy !== false) app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  if (opts.enableCompression !== false) {
    app.use(compression() as unknown as express.RequestHandler);
  }

  // CORS + Preflight
  app.use(buildCors(allowedOrigins));
  addPreflight(app, allowedOrigins);

  // Parsers
  app.use(express.json({ limit: opts.jsonLimit || "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: opts.urlencodedLimit || "1mb" }));

  // Static (z. B. /verified Seiten)
  if (opts.staticDir) {
    app.use(express.static(opts.staticDir, { maxAge: "1h", index: false }));
  } else {
    const fallback = path.join(__dirname, "..", "public");
    app.use(express.static(fallback, { maxAge: "1h", index: false }));
  }

  // Rate limit (Default; enge Limits machst du in den einzelnen Routes)
  const limiter =
    typeof opts.rateLimiter === "function"
      ? (opts.rateLimiter as ReturnType<typeof rateLimit>)
      : rateLimit({
          windowMs: (opts.rateLimiter as any)?.windowMs ?? 60_000,
          max: (opts.rateLimiter as any)?.max ?? 60,
          standardHeaders: true,
          legacyHeaders: false
        });

  // Health
  app.get("/api/health", (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));

  // ✅ ZENTRALES AUTH-ROUTING
  // - /auth/... wird u. a. für GET /auth/verify-email (Hosting-Rewrite) benutzt – ohne globalen Limiter
  app.use("/auth", authRouter);

  // - /api/auth/... ist deine API-Basis – hier kannst du ein moderates globales Limit setzen
  app.use("/api/auth", limiter, authRouter);

  return app;
}

export const app = initApp();
export default app;