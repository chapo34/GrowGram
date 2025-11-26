// functions/src/controllers/verifyController.ts
import type { Request, Response } from 'express';
import * as functionsConf from 'firebase-functions/v1';
import { db, admin } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

type TokenPayload = { userId: string; email?: string; iat?: number; exp?: number };

const FieldValue = admin.firestore.FieldValue;

// ---- helpers ---------------------------------------------------------------

function pickToken(req: Request): string | undefined {
  let raw =
    (typeof req.query.token === 'string' && req.query.token) ||
    (typeof req.query.t === 'string' && req.query.t) ||
    (typeof req.query.code === 'string' && req.query.code) ||
    (typeof req.query.oobCode === 'string' && req.query.oobCode) ||
    undefined;

  if (!raw) {
    const hdr = req.header('authorization') || req.header('Authorization');
    if (hdr && hdr.toLowerCase().startsWith('bearer ')) raw = hdr.slice(7).trim();
  }

  if (!raw) return undefined;

  try {
    const once = decodeURIComponent(raw);
    if ((once.match(/\./g) || []).length === 2) return once;
  } catch {/* ignore */}
  return raw;
}

function joinUrl(base: string, suffix: string) {
  if (!base) return suffix;
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${b}${s}`;
}

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

// ---- controller ------------------------------------------------------------

export const verifyEmailController = async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store');

  const token = pickToken(req);
  if (!token) {
    res.status(400).json({ ok: false, error: 'Missing token' });
    return;
  }

  const c: any = (functionsConf as any).config?.() ?? {};
  const baseurl: string = c?.app?.baseurl || process.env.APP_BASEURL || '';
  const redirectUrl: string = c?.app?.redirecturl || process.env.APP_REDIRECTURL || '/verified';

  try {
    const payload = verifyToken<TokenPayload>(token);
    if (!payload?.userId) {
      res.status(400).json({ ok: false, error: 'Invalid token payload' });
      return;
    }

    const userRef = db.collection('users').doc(payload.userId);

    const result = await db.runTransaction(async (trx) => {
      const snap = await trx.get(userRef);
      if (!snap.exists) return { status: 'not_found' as const };

      const user = (snap.data() || {}) as { email?: string; isVerified?: boolean };
      if (payload.email && user.email && String(user.email).toLowerCase() !== String(payload.email).toLowerCase()) {
        return { status: 'email_mismatch' as const, email: user.email as string | undefined };
      }

      if (user.isVerified) {
        return { status: 'already' as const, email: (user.email || payload.email) as string | undefined };
      }

      trx.set(
        userRef,
        {
          isVerified: true,
          verifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { status: 'ok' as const, email: (user.email || payload.email) as string | undefined };
    });

    // Warteliste auch auf confirmed setzen (nicht blockierend, aber awaited vorm Redirect)
    try {
      await confirmWaitlistByEmail(result.email || payload.email);
    } catch (e) {
      console.warn('waitlist confirm failed (non-blocking):', (e as any)?.message || e);
    }

    if (baseurl) {
      const target =
        result.status === 'ok'
          ? joinUrl(baseurl, `${redirectUrl}?status=ok`)
          : result.status === 'already'
          ? joinUrl(baseurl, `${redirectUrl}?status=already`)
          : result.status === 'email_mismatch'
          ? joinUrl(baseurl, `${redirectUrl}?status=error&reason=email_mismatch`)
          : joinUrl(baseurl, `${redirectUrl}?status=error&reason=not_found`);

      res.status(302).set('Location', target).end();
      return;
    }

    // JSON-Fallback
    if (result.status === 'ok') { res.status(200).json({ ok: true, message: 'E-Mail erfolgreich verifiziert.' }); return; }
    if (result.status === 'already') { res.status(200).json({ ok: true, message: 'Schon verifiziert.' }); return; }
    if (result.status === 'email_mismatch') { res.status(400).json({ ok: false, error: 'Email mismatch' }); return; }
    res.status(404).json({ ok: false, error: 'User not found' });
  } catch (err) {
    console.error('verifyEmailController error:', (err as any)?.message || err);
    res.status(400).json({ ok: false, error: 'Invalid token' });
  }
};