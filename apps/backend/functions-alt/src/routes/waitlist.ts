import { Router } from 'express';
import type { Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { newPublicId, newViewerToken, hashToken } from '../utils/waitlistPublic.js';
import { sendWaitlistConfirmEmail } from '../services/emailService.js';

const router = Router();
const db = getFirestore();
const APP_URL = (process.env.APP_URL || 'https://growgram-app.com').replace(/\/$/, '');

/* ---------------- Helpers ---------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MAX = { name: 80, email: 254, country: 56, discord: 80 };

const norm = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (s: string) => EMAIL_RE.test(s);

type RecaptchaVerifyJSON = {
  success?: boolean; score?: number; action?: string;
  hostname?: string; challenge_ts?: string; ['error-codes']?: string[];
};

async function verifyRecaptcha(
  token?: string,
  ip?: string
): Promise<{ ok: boolean; score?: number; action?: string; code?: string }> {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return { ok: true }; // deaktiviert
  if (!token)  return { ok: false, code: 'missing_token' };

  const form = new URLSearchParams();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  const json = (await resp.json().catch(() => ({}))) as RecaptchaVerifyJSON;
  return { ok: !!json.success, score: json.score, action: json.action, code: json['error-codes']?.[0] };
}

/* ---------------- POST /waitlist (Signup) ---------------- */
router.post('/', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.is('application/json')) {
      return res.status(415).json({ ok: false, error: 'unsupported_media_type' });
    }

    const {
      name = '', email = '', country = '', discord = '', consent = false,
      website = '', trap = '', // Honeypots
      recaptchaToken,
    } = (req.body || {}) as Record<string, unknown>;

    if (website || trap) return res.status(200).json({ ok: true, bot: true });

    const _name    = norm(name, MAX.name);
    const _email   = norm(email, MAX.email).toLowerCase();
    const _country = norm(country, MAX.country);
    const _discord = norm(discord, MAX.discord);
    const _consent = Boolean(consent);

    if (!_email || !isEmail(_email)) return res.status(400).json({ ok: false, error: 'invalid_email' });
    if (!_consent)                  return res.status(400).json({ ok: false, error: 'need_consent' });

    const ua = String(req.headers['user-agent'] || '');
    const ip = String((req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')).split(',')[0].trim();
    const referer = String(req.get('referer') || '');

    const rec = await verifyRecaptcha(typeof recaptchaToken === 'string' ? recaptchaToken : undefined, ip);
    if (!rec.ok) return res.status(400).json({ ok: false, error: 'captcha_failed', code: rec.code });

    const now = FieldValue.serverTimestamp();
    const docRef = db.collection('waitlist').doc(_email);
    const snap = await docRef.get();

    // Erstanlage -> IDs
    let publicId: string | undefined;
    let viewerToken: string | undefined;
    let viewerHash: string | undefined;

    if (!snap.exists) {
      publicId   = newPublicId('GG');
      viewerToken = newViewerToken(16);
      viewerHash  = hashToken(viewerToken);
    }

    await docRef.set(
      {
        email: _email,
        name: _name || null,
        country: _country || null,
        discord: _discord || null,
        consent: _consent,
        ua, ip, referer,
        source: 'website',
        status: snap.exists ? (snap.get('status') || 'pending') : 'pending',
        ...(publicId ? { publicId } : {}),
        ...(viewerHash ? { viewerHash, viewerIssuedAt: now } : {}),
        ...(snap.exists ? {} : { createdAt: now }),
        updatedAt: now,
      },
      { merge: true }
    );

    // Nur beim ersten Signup Mail senden
    if (viewerToken && publicId) {
      const firstName = (_name || '').split(/\s+/)[0] || 'Friend';
      try {
        await sendWaitlistConfirmEmail({
          to: _email,
          firstName,
          publicId,
          viewerToken,
          appUrl: APP_URL,
          userId: publicId,
        });
      } catch (e: any) {
        console.error('[waitlist] send email failed:', e?.message || e);
      }
    }

    return res.status(200).json({
      ok: true,
      publicId: publicId || (snap.exists ? (snap.get('publicId') as string | undefined) : undefined) || null,
      viewerToken: viewerToken || null, // nur bei erster Anmeldung vorhanden
    });
  } catch (err: any) {
    console.error('waitlist error:', err);
    return res.status(500).json({ ok: false, error: 'server_error', details: err?.message || 'unknown' });
  }
});

/* ---------------- POST /waitlist/status ---------------- */
router.post('/status', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.is('application/json')) return res.status(415).json({ ok: false, error: 'unsupported_media_type' });

    const { publicId = '', token = '' } = (req.body || {}) as Record<string, string>;
    const _id = String(publicId || '').trim().toUpperCase();
    const _tk = String(token || '').trim();
    if (!_id || !_tk) return res.status(400).json({ ok: false, error: 'missing_id_or_token' });

    const qs = await db.collection('waitlist').where('publicId', '==', _id).limit(1).get();
    if (qs.empty) return res.status(404).json({ ok: false, error: 'not_found' });

    const doc = qs.docs[0];
    const data = doc.data();
    const hash = data.viewerHash as string | undefined;
    if (!hash) return res.status(403).json({ ok: false, error: 'no_token_set' });
    if (hashToken(_tk) !== hash) return res.status(403).json({ ok: false, error: 'invalid_token' });

    const status = String(data.status || 'pending');
    const confirmed     = !!data.confirmedAt;
    const discordJoined = !!data.discordJoinedAt;
    const admitted      = status === 'admitted';

    const cfgSnap = await db.collection('config').doc('waitlist').get();
    const seats   = Number(cfgSnap.get('seats') ?? 500);
    const cohort  = String(cfgSnap.get('cohort') ?? 'beta-2025');

    const admittedCount =
      (await db.collection('waitlist').where('status', '==', 'admitted').count().get()).data().count;

    return res.status(200).json({
      ok: true,
      publicId: _id,
      status,
      steps: { registered: true, confirmed, discordJoined, admitted },
      seats: { total: seats, admitted: admittedCount, remaining: Math.max(0, seats - admittedCount), cohort },
      createdAt: data.createdAt?.toMillis?.() ?? null,
      updatedAt: data.updatedAt?.toMillis?.() ?? null,
    });
  } catch (err: any) {
    console.error('waitlist status error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/* ---------------- GET /waitlist/confirm ---------------- */
router.get('/confirm', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const _id = String(req.query.pid || '').trim().toUpperCase();
    const _tk = String(req.query.t || '').trim();

    if (!_id || !_tk) {
      return res.redirect(`${APP_URL}/waitlist-status?err=missing`);
    }

    const qs = await db.collection('waitlist').where('publicId', '==', _id).limit(1).get();
    if (qs.empty) {
      return res.redirect(`${APP_URL}/waitlist-status?publicId=${encodeURIComponent(_id)}&err=not_found`);
    }

    const doc  = qs.docs[0];
    const data = doc.data();
    const hash = data.viewerHash as string | undefined;
    if (!hash || hashToken(_tk) !== hash) {
      return res.redirect(`${APP_URL}/waitlist-status?publicId=${encodeURIComponent(_id)}&err=invalid_token`);
    }

    if (!data.confirmedAt) {
      await doc.ref.set(
        {
          confirmedAt: FieldValue.serverTimestamp(),
          status: (data.status === 'admitted') ? 'admitted' : 'confirmed',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return res.redirect(
      `${APP_URL}/waitlist-status?publicId=${encodeURIComponent(_id)}&token=${encodeURIComponent(_tk)}&ok=1`
    );
  } catch (err: any) {
    console.error('waitlist confirm error:', err);
    return res.redirect(`${APP_URL}/waitlist-status?err=server`);
  }
});

/* ---------------- POST /waitlist/discord-ack ---------------- */
router.post('/discord-ack', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.is('application/json')) return res.status(415).json({ ok: false, error: 'unsupported_media_type' });

    const { publicId = '', token = '' } = (req.body || {}) as Record<string, string>;
    const _id = String(publicId || '').trim().toUpperCase();
    const _tk = String(token || '').trim();
    if (!_id || !_tk) return res.status(400).json({ ok: false, error: 'missing_id_or_token' });

    const qs = await db.collection('waitlist').where('publicId', '==', _id).limit(1).get();
    if (qs.empty) return res.status(404).json({ ok: false, error: 'not_found' });

    const ref  = qs.docs[0].ref;
    const data = qs.docs[0].data();
    const hash = data.viewerHash as string | undefined;
    if (!hash || hashToken(_tk) !== hash) return res.status(403).json({ ok: false, error: 'invalid_token' });

    await ref.set(
      { discordJoinedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('discord-ack error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/* ---------------- GET /waitlist/metrics/public ---------------- */
router.get('/metrics/public', async (_req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=30');

    const cfgSnap = await db.collection('config').doc('waitlist').get();
    const seats  = Number(cfgSnap.get('seats') ?? 500);
    const cohort = String(cfgSnap.get('cohort') ?? 'beta-2025');

    const [pending, confirmed, admitted] = await Promise.all([
      db.collection('waitlist').where('status', '==', 'pending').count().get(),
      db.collection('waitlist').where('status', '==', 'confirmed').count().get(),
      db.collection('waitlist').where('status', '==', 'admitted').count().get(),
    ]);

    return res.status(200).json({
      ok: true,
      seats: { total: seats, cohort, admitted: admitted.data().count, remaining: Math.max(0, seats - admitted.data().count) },
      counts: { pending: pending.data().count, confirmed: confirmed.data().count, admitted: admitted.data().count },
    });
  } catch (err: any) {
    console.error('metrics error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

export default router;