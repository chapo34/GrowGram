import type { Request, Response } from 'express';
import { db, admin } from '../../config/firebase.js';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, city, birthDate } = (req.body ?? {}) as Record<string, any>;
    if (!email || !password) {
      return res.status(400).json({ error: 'bad_request', details: 'email_and_password_required' });
    }

    // Nutzer anlegen oder vorhandenen holen
    let authUser;
    try {
      authUser = await admin.auth().getUserByEmail(email);
    } catch {
      authUser = await admin.auth().createUser({ email, password, displayName: [firstName, lastName].filter(Boolean).join(' ') });
    }

    const uid = authUser.uid;
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('users').doc(uid).set({
      id: uid,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      city: city ?? null,
      birthDate: birthDate ?? null,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    // Verifizierungs-Mail (optional – wenn Service vorhanden)
    try {
      const mod = await import('../../services/auth/email.service.js').catch(() => null) as any;
      if (mod?.sendVerificationEmail) {
        const linkMod = await import('../../services/auth/jwt.service.js').catch(() => null) as any;
        const token = linkMod?.signEmailVerification ? await linkMod.signEmailVerification({ userId: uid, email }) : null;
        const base = process.env.APP_BASEURL || 'https://growgram-app.com';
        const verifyUrl = token
          ? `${base}/api/auth/verify-email?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`
          : `${base}/api/auth/verify-email?uid=${encodeURIComponent(uid)}`;
        await mod.sendVerificationEmail({ firstName, email, verificationUrl: verifyUrl });
      }
    } catch (e) {
      console.warn('[register] verification email not sent:', e);
    }

    return res.status(201).json({ ok: true, userId: uid });
  } catch (e: any) {
    console.error('[register]', e);
    return res.status(500).json({ error: 'internal', details: 'register_failed' });
  }
}