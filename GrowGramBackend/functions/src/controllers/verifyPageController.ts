// functions/src/controllers/verifyPageController.ts
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, admin } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const users = db.collection('users');
const FieldValue = admin.firestore.FieldValue;

const sendHtml = (
  res: Response,
  file: 'verify-success.html' | 'verify-already.html' | 'verify-error.html'
) => res.sendFile(path.join(__dirname, '..', 'public', file));

async function confirmWaitlistByEmail(email?: string) {
  if (!email) return;
  const docId = email.toLowerCase();
  const ref = db.collection('waitlist').doc(docId);
  await ref.set(
    {
      email: docId,
      status: 'confirmed',
      confirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * GET /auth/verify-email-page?token=...
 * Zeigt eine HTML-Seite (Success/Already/Error) und markiert zusätzlich die Waitlist.
 */
export async function verifyEmailPage(req: Request, res: Response) {
  try {
    const token =
      (typeof req.query.token === 'string' && req.query.token) ||
      (typeof (req.params as any)?.token === 'string' && (req.params as any).token) ||
      null;

    if (!token) return sendHtml(res, 'verify-error.html');

    const payload = verifyToken(token) as any; // { userId?: string; email?: string; ... }
    if (!payload || typeof payload === 'string' || !payload.userId) {
      return sendHtml(res, 'verify-error.html');
    }

    const ref = users.doc(payload.userId);
    const snap = await ref.get();
    if (!snap.exists) return sendHtml(res, 'verify-error.html');

    const u = (snap.data() || {}) as { isVerified?: boolean; email?: string };
    const email = String(u.email || payload.email || '').toLowerCase() || undefined;

    if (u.isVerified) {
      // War schon verifiziert → Waitlist ggf. trotzdem aktualisieren
      await confirmWaitlistByEmail(email);
      return sendHtml(res, 'verify-already.html');
    }

    await ref.set(
      {
        isVerified: true,
        verifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await confirmWaitlistByEmail(email);
    return sendHtml(res, 'verify-success.html');
  } catch (err) {
    console.error('[verifyEmailPage] error', err);
    return sendHtml(res, 'verify-error.html');
  }
}