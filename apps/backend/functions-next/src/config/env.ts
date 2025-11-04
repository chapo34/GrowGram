// ESM-kompatibel: lädt .env wenn lokal, ignoriert in Cloud Functions
import 'dotenv/config';

export type Env = {
  NODE_ENV: 'development' | 'production' | 'test';
  REGION: string;

  // App/Base
  APP_BASEURL?: string;

  // Buckets/Storage
  GCS_BUCKET?: string;

  // Mail/3rd party (optional)
  SENDGRID_API_KEY?: string;

  // Logging
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
};

function req(name: keyof Env, fallback?: string): string {
  const v = process.env[name as string] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env: ${String(name)}`);
  }
  return v;
}

export const ENV: Env = {
  NODE_ENV: (process.env.NODE_ENV as any) || 'development',
  REGION: process.env.REGION || 'europe-west3',

  APP_BASEURL: process.env.APP_BASEURL,

  GCS_BUCKET: process.env.GCS_BUCKET,

  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,

  LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
};

// Häufig gebrauchte Ableitungen
export const IS_PROD = ENV.NODE_ENV === 'production';
export const IS_DEV = !IS_PROD;