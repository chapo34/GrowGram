import { admin, db } from '../../config/firebase.js';

/** Holt das User-Dokument zu einer E-Mail. */
export async function getUserDocByEmail(email: string) {
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/** Löscht User in Firestore + Auth (best effort). */
export async function purgeUserByEmail(email: string) {
  // Firestore
  const q = await db.collection('users').where('email', '==', email).get();
  if (!q.empty) {
    const batch = db.batch();
    q.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => batch.delete(doc.ref));
    await batch.commit();
  }
  // Auth
  try {
    const u = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(u.uid);
  } catch {
    /* ignore not found */
  }
}

/** Polling-Helper: wartet bis predicate(value) true zurückgibt oder Timeout. */
export async function waitFor<T>(
  producer: () => Promise<T | null | undefined>,
  predicate: (val: T | null | undefined) => boolean,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T | null | undefined> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const intervalMs = opts.intervalMs ?? 150;
  const t0 = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const v = await producer();
    if (predicate(v)) return v;
    if (Date.now() - t0 > timeoutMs) return v;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** Mappt eine (Frontend-)Verify-URL auf den Backend-Pfad für supertest/Express. */
export function toBackendVerifyPath(verifyUrl: string): string {
  try {
    const u = new URL(verifyUrl, 'http://localhost'); // falls nur Pfad
    const token = u.searchParams.get('token') || '';

    // Bereits ein Backend-Pfad? Dann mit Query zurückgeben.
    if (u.pathname === '/auth/verify-email') {
      return `/auth/verify-email?token=${encodeURIComponent(token)}`;
    }

    // Frontend-Pfad → Backend-Pfad umschreiben
    if (u.pathname === '/verify-email') {
      return `/auth/verify-email?token=${encodeURIComponent(token)}`;
    }

    // Vollständige Cloud Functions URL? (…/apiV1/auth/verify-email?token=…)
    if (/\/auth\/verify-email$/.test(u.pathname)) {
      return `/auth/verify-email?token=${encodeURIComponent(token)}`;
    }

    // Fallback: unverändert zurück
    return `${u.pathname}${u.search}`;
  } catch {
    // Wenn verifyUrl schon ein Plain-Pfad ist:
    if (verifyUrl.startsWith('/verify-email')) {
      const token = (verifyUrl.split('token=')[1] || '').split('&')[0];
      return `/auth/verify-email?token=${encodeURIComponent(token)}`;
    }
    return verifyUrl;
  }
}