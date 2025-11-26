// src/config/env.ts
// Lädt .env NUR lokal (Emulator/Vitest). In Produktion kommen ENV/Secrets automatisch.
if (process.env.FUNCTIONS_EMULATOR || process.env.VITEST) {
  // Top-Level dynamic import, damit ESM sauber bleibt
  await import("dotenv/config");
}

/** nimmt den ersten gesetzten Wert aus einer Liste von Keys */
function pick(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

/** Umgebung */
export const NODE_ENV =
  (pick("NODE_ENV") as "development" | "production" | "test") || "development";
export const REGION = pick("REGION") || "europe-west3";

/** URLs / Routing */
export const APP_BASEURL =
  pick("APP_BASEURL", "app.baseurl") || "http://127.0.0.1:5002";
export const APP_REDIRECTURL =
  pick("APP_REDIRECTURL", "app.redirecturl") || "/verified";

/** JWT / Tokens */
export const JWT_EXPIRES = pick("JWT_EXPIRES", "jwt.expires") || "1d";
export const RESET_EXPIRES = pick("RESET_TOKEN_EXPIRES") || "15m";

/** Projekt-ID (Fallback für Storage) */
export const PROJECT_ID =
  pick("GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT", "FIREBASE_PROJECT_ID") || "";

/** Storage Bucket */
export const STORAGE_BUCKET =
  pick("STORAGE_BUCKET", "GCS_BUCKET", "GCS_BUCKET_NAME", "storage.bucket") ||
  (PROJECT_ID ? `${PROJECT_ID}.appspot.com` : "");

/** Logging */
export const LOG_LEVEL =
  (pick("LOG_LEVEL") as "debug" | "info" | "warn" | "error") || "info";

/** Gen2-Functions Secrets als SecretParam (werden in onRequest.secrets gebunden) */
import { defineSecret } from "firebase-functions/params";

export const JWT_SECRET       = defineSecret("JWT_SECRET");
export const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
export const WEB_API_KEY      = defineSecret("WEB_API_KEY");

/** Optionaler Required-Reader */
export function requireEnv(name: string, ...aliases: string[]): string {
  const v = pick(name, ...aliases);
  if (!v) throw new Error(`Missing env: ${[name, ...aliases].join(" | ")}`);
  return v;
}

/**
 * ✅ Admin-Token zur Laufzeit aus ENV lesen.
 *  - Deployment: NEXUS_ADMIN_TASK_TOKEN als normale Env-Var
 *  - Emulator: kommt aus .env
 */
export function getAdminTaskToken(): string {
  const v = pick("NEXUS_ADMIN_TASK_TOKEN");
  if (!v) {
    throw new Error("Missing env: NEXUS_ADMIN_TASK_TOKEN");
  }
  return v;
}
// src/config/env.ts (Ergänzung unten)

// --------------------------------------------------------
// Age Verification Mode / Provider
// --------------------------------------------------------

export type AgeVerificationMode = "DEV_MANUAL" | "KJM_SANDBOX" | "KJM_LIVE";

export const AGE_VERIFICATION_MODE: AgeVerificationMode =
  (pick("AGE_VERIFICATION_MODE") as AgeVerificationMode) || "DEV_MANUAL";

/**
 * Optional: Name des externen Providers (Dokumentation / Logging)
 * z.B. "idnow", "nect", "onfido", "custom-kjm".
 */
export const AGE_VERIFICATION_PROVIDER =
  pick("AGE_VERIFICATION_PROVIDER") || "dev-manual";