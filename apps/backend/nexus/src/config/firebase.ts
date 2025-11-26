import 'dotenv/config';
import admin from 'firebase-admin';

/**
 * Projekt-/Bucket-Ermittlung
 * - Lokal via .env: STORAGE_BUCKET | GCS_BUCKET | GCS_BUCKET_NAME
 * - Fallback: <PROJECT_ID>.appspot.com
 */
const PROJECT_ID: string =
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  '';

const BUCKET_NAME: string =
  process.env.STORAGE_BUCKET ||
  process.env.GCS_BUCKET ||
  process.env.GCS_BUCKET_NAME ||
  (PROJECT_ID ? `${PROJECT_ID}.appspot.com` : '');

/** Emulator-Mapping für Storage (Admin SDK liest FIREBASE_STORAGE_EMULATOR_HOST) */
if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST && process.env.STORAGE_EMULATOR_HOST) {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.STORAGE_EMULATOR_HOST;
}

/** Admin initialisieren (einmalig) – Default-Import ist entscheidend */
if (admin.apps.length === 0) {
  admin.initializeApp({
    ...(BUCKET_NAME ? { storageBucket: BUCKET_NAME } : {}),
  });
}

/** Primäre Dienste */
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

/** Firestore Helpers (für bestehende Imports) */
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export const FieldPath = admin.firestore.FieldPath;

/** Zeit-Helfer */
export const nowISO = (): string => new Date().toISOString();

/**
 * Vorkonfigurierter Bucket (für bestehende Imports).
 * Wenn kein Bucket gesetzt ist, versucht das SDK den Default zu verwenden.
 * Fehler treten dann erst beim tatsächlichen Bucket-Zugriff auf.
 */
export const bucket = BUCKET_NAME ? storage.bucket(BUCKET_NAME) : storage.bucket();

/** Optional: komplettes admin-Objekt (Legacy-Stellen erwarten `admin`) */
export { admin };

/** On-Demand Getter mit klarer Fehlermeldung */
export function getBucket() {
  const name = BUCKET_NAME;
  if (!name || !/^[a-z0-9.\-_]+$/.test(name)) {
    throw new Error(
      'Storage bucket is not configured. ' +
        'Setze in backend/nexus/.env: STORAGE_BUCKET=<project-id>.appspot.com ' +
        'oder via Config: firebase functions:config:set storage.bucket="<project-id>.appspot.com"'
    );
  }
  return storage.bucket(name);
}

/** Try-Getter ohne Throw – liefert null bei fehlender Konfiguration */
export function tryGetBucket() {
  try {
    return getBucket();
  } catch {
    return null as unknown as ReturnType<typeof storage.bucket>;
  }
}