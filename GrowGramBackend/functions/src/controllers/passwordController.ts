// functions/src/controllers/passwordController.ts
import type { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateResetToken, verifyResetToken, decodeUnsafe } from '../utils/jwtUtils.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const isEmu =
  process.env.FUNCTIONS_EMULATOR === 'true' ||
  !!process.env.FIREBASE_EMULATOR_HUB ||
  process.env.NODE_ENV === 'development';

const isDryRun = (process.env.SENDGRID_API_KEY || '').toLowerCase() === 'dryrun';
const APP_URL = process.env.APP_URL || 'https://growgram.web.app';

const COOLDOWN_MS = 2 * 60 * 1000; // 2 Minuten

const USER_COL = 'users';
const SECRETS_SUB = 'secrets';
const RESETS_SUB = 'passwordResets';

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}
function nowIso() {
  return new Date().toISOString();
}
function getClientMeta(req: Request) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.socket as any)?.remoteAddress ||
    undefined;
  const ua = (req.headers['user-agent'] as string) || undefined;
  return { ip, ua };
}
function logErr(tag: string, err: unknown) {
  const e = err as any;
  if (isEmu) console.error(`[${tag}]`, { message: e?.message, stack: e?.stack });
  else console.error(`[${tag}]`, { message: e?.message });
}

export async function requestPasswordReset(req: Request, res: Response) {
  const started = Date.now();
  try {
    const emailRaw = String(req.body?.email || '').trim().toLowerCase();
    if (!emailRaw) {
      await new Promise((r) => setTimeout(r, 200));
      return res.json({ ok: true, message: 'If account exists, email sent' });
    }

    const snap = await db.collection(USER_COL).where('email', '==', emailRaw).limit(1).get();

    if (snap.empty) {
      const pad = 250 - (Date.now() - started);
      if (pad > 0) await new Promise((r) => setTimeout(r, pad));
      return res.json({ ok: true, message: 'If account exists, email sent' });
    }

    const doc = snap.docs[0];
    const userId = doc.id;
    const user = doc.data() as any;

    const lastReqAt = user?.passwordReset?.lastRequestedAt
      ? new Date(user.passwordReset.lastRequestedAt).getTime()
      : 0;
    const tooSoon = Date.now() - lastReqAt < COOLDOWN_MS;

    if (!tooSoon) {
      const token = generateResetToken({ userId });
      const decoded: any = decodeUnsafe(token);
      const jti: string | undefined = decoded?.jti;
      const expSec: number | undefined = decoded?.exp;
      const tokenHash = sha256Hex(token);
      if (!jti) throw new Error('reset_token_missing_jti');

      const { ip, ua } = getClientMeta(req);

      const resetRef = db
        .collection(USER_COL)
        .doc(userId)
        .collection(SECRETS_SUB)
        .doc(RESETS_SUB)
        .collection(RESETS_SUB)
        .doc(jti);

      await resetRef.set({
        tokenHash,
        createdAt: nowIso(),
        expAt: expSec ? new Date(expSec * 1000).toISOString() : null,
        used: false,
        meta: { ip, ua },
      });

      await db.collection(USER_COL).doc(userId).set(
        {
          passwordReset: {
            lastRequestedAt: nowIso(),
            lastJti: jti,
            count: (user?.passwordReset?.count || 0) + 1,
          },
        },
        { merge: true }
      );

      const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({
        to: emailRaw,
        firstName: user?.firstName || 'GrowGram User',
        resetUrl,
        appUrl: APP_URL,
      });

      if (isEmu || isDryRun) {
        return res.json({ ok: true, message: 'reset_email_sent', token });
      }
    }

    const pad = 250 - (Date.now() - started);
    if (pad > 0) await new Promise((r) => setTimeout(r, pad));
    return res.json({ ok: true, message: 'reset_email_sent' });
  } catch (err) {
    logErr('requestPasswordReset', err);
    const pad = 250 - (Date.now() - started);
    if (pad > 0) await new Promise((r) => setTimeout(r, pad));
    return res.json({ ok: true, message: 'reset_email_sent' });
  }
}

export async function resetPasswordConfirm(req: Request, res: Response) {
  try {
    const token = String(req.body?.token || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!token || !newPassword) return res.status(400).json({ error: 'missing_fields' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'password_too_short' });

    const payload = verifyResetToken(token);
    const { userId, jti, exp } = payload;
    if (!userId || !jti) throw new Error('invalid_reset_payload');

    const userRef = db.collection(USER_COL).doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(400).json({ error: 'invalid_or_expired_token' });

    const resetRef = db
      .collection(USER_COL)
      .doc(userId)
      .collection(SECRETS_SUB)
      .doc(RESETS_SUB)
      .collection(RESETS_SUB)
      .doc(jti);

    const resetSnap = await resetRef.get();
    if (!resetSnap.exists) return res.status(400).json({ error: 'invalid_or_expired_token' });

    const resetData = resetSnap.data() as any;
    if (resetData.used) return res.status(400).json({ error: 'invalid_or_expired_token' });

    if (typeof exp === 'number' && Date.now() >= exp * 1000) {
      return res.status(400).json({ error: 'invalid_or_expired_token' });
    }

    const tokenHash = sha256Hex(token);
    if (resetData.tokenHash !== tokenHash) {
      return res.status(400).json({ error: 'invalid_or_expired_token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await userRef.set(
      {
        password: hash,
        updatedAt: nowIso(),
        sessionsRevokedAt: nowIso(),
      },
      { merge: true }
    );

    await resetRef.set({ used: true, usedAt: nowIso() }, { merge: true });

    return res.json({ ok: true, message: 'password_updated' });
  } catch (err) {
    logErr('resetPasswordConfirm', err);
    return res.status(400).json({ error: 'invalid_or_expired_token' });
  }
}