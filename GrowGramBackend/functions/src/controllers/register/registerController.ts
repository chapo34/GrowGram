// functions/src/controllers/registerUserController.ts
import type { Request, Response } from 'express';
import * as functionsConf from 'firebase-functions/v1';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateToken } from '../../utils/jwtUtils.js';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

type Body = {
  userId?: string;
  email?: string;
  firstName?: string;
  username?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, email, firstName, username }: Body = (req.body ?? {}) as Body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!userId || !cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      res.status(400).json({ ok: false, error: 'missing/invalid userId or email' });
      return;
    }

    const c: any = (functionsConf as any).config?.() ?? {};
    const jwtExpires: string | number | undefined = (c?.jwt?.expires as any) ?? process.env.JWT_EXPIRES;

    const ts = FieldValue.serverTimestamp();
    await db.doc(`users/${userId}`).set(
      {
        email: cleanEmail,
        firstName: firstName || null,
        username: username ?? null,
        isVerified: false,
        createdAt: ts,
        updatedAt: ts,
      },
      { merge: true }
    );

    const token = generateToken({ userId, email: cleanEmail, expiresIn: jwtExpires });

    const hostingBase =
      c?.app?.baseurl ||
      process.env.APP_BASEURL ||
      'https://growgram-backend.web.app';

    const verifyUrl = `${hostingBase.replace(/\/$/, '')}/auth/verify-email?token=${encodeURIComponent(
      token
    )}`;

    if (c?.sendgrid?.key && c?.sendgrid?.template?.verify) {
      try {
        const sg = (await import('@sendgrid/mail')).default;
        sg.setApiKey(String(c.sendgrid.key));
        await sg.send({
          to: cleanEmail,
          from: (c?.sendgrid?.from as string) || 'no-reply@growgram-app.com',
          templateId: String(c.sendgrid.template.verify),
          dynamicTemplateData: {
            firstName: firstName || '',
            verificationUrl: verifyUrl,
            appName: 'GrowGram',
          },
        });
      } catch (e) {
        console.warn('sendgrid_failed', e);
      }
    }

    res.status(201).json({ ok: true, verifyUrl });
  } catch (err) {
    console.error('registerUserController error:', err);
    res.status(500).json({ ok: false, error: 'register_failed' });
  }
};

export default registerUserController;