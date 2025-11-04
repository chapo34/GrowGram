/**
 * Firebase Admin bootstrap (Functions Gen2 ready)
 * - Single-init Guard
 * - Clean named exports (db, auth, storage, bucket, admin, FieldValue, Timestamp)
 * - Env validation + Emulator support
 */
import admin from 'firebase-admin';

type InitOpts = {
  storageBucket?: string | null;
};

function readEnv(): InitOpts {
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || null;
  return { storageBucket };
}

// --- initialize (idempotent) ---
const { storageBucket } = readEnv();

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

// --- core handles ---
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const bucket = storage.bucket();

// handy re-exports for callers that need them
export { admin };
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

/**
 * Small helpers to keep code clean in repos/services.
 */

// RFC3339 now()
export const nowISO = () => new Date().toISOString();

// Type-safe get by id (throws 404-like error if missing when strict=true)
export async function getRequiredDoc<T = admin.firestore.DocumentData>(
  ref: admin.firestore.DocumentReference<T>,
  strict = true,
): Promise<admin.firestore.DocumentSnapshot<T>> {
  const snap = await ref.get();
  if (!snap.exists && strict) {
    const err: any = new Error('Document not found');
    err.code = 'not_found';
    err.status = 404;
    throw err;
  }
  return snap;
}