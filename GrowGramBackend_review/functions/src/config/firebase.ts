// functions/src/config/firebase.ts
import admin from 'firebase-admin';                 // <- default import (wie vorher)
import * as functions from 'firebase-functions/v1'; // <- passend zu deinem index.ts
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const cfg: any = (functions as any).config ? (functions as any).config() : {};

// --- Service Account optional (lokal). In der Cloud nimmt Firebase die Default-Creds.
function resolveServiceAccountPath(): string | null {
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (p) {
    const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    if (existsSync(abs)) return abs;
  }
  const candidates = [
    path.join(__dirname, 'firebaseServiceAccount.json'),
    path.join(__dirname, '..', 'config', 'firebaseServiceAccount.json'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

// FIREBASE_CONFIG lesen (Functions setzt das automatisch)
function readFirebaseConfig(): { projectId?: string; storageBucket?: string } {
  try {
    const raw = process.env.FIREBASE_CONFIG;
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

const fbc = readFirebaseConfig();
const projectId =
  fbc.projectId ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  '';

// Bucket-Name sicher ableiten (ohne zu throwen)
function resolveBucketName(): string | undefined {
  // 1) aus FIREBASE_CONFIG (beste Quelle in Cloud Functions)
  if (fbc.storageBucket) return fbc.storageBucket;

  // 2) aus functions:config (firebase functions:config:set storage.bucket="…")
  if (cfg?.storage?.bucket) return String(cfg.storage.bucket);

  // 3) aus .env (kein reservierter Prefix!)
  if (process.env.GCS_BUCKET_NAME) return process.env.GCS_BUCKET_NAME;

  // 4) alternative Keys
  if (process.env.GCLOUD_STORAGE_BUCKET) return process.env.GCLOUD_STORAGE_BUCKET;

  // 5) Fallback: Standard-Firebase-Bucket-ID (NICHT die Domain!)
  if (projectId) return `${projectId}.appspot.com`;

  return undefined;
}

export const bucketName = resolveBucketName();

// App initialisieren (ohne Crash, auch wenn bucketName fehlt)
if (!admin.apps.length) {
  const sa = resolveServiceAccountPath();
  if (sa) {
    const json = JSON.parse(readFileSync(sa, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(json),
      ...(bucketName ? { storageBucket: bucketName } : {}),
    });
  } else {
    admin.initializeApp(
      bucketName ? { storageBucket: bucketName } : undefined
    );
  }
  if (!bucketName) {
    console.warn('⚠️  Kein Storage-Bucket konfiguriert – Storage-Routen liefern „storage_not_configured“.');
  } else {
    console.log('✅ Storage-Bucket:', bucketName);
  }
}

// Exporte (wie zuvor von dir verwendet)
export { admin };
export const db     = admin.firestore();
export const auth   = admin.auth();
export const bucket = admin.storage().bucket(bucketName || undefined);