import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { generateToken } from './utils/jwtUtils.js';

const DEV_SECRET = process.env.DEV_LINK_SECRET as string | undefined;
const APP_BASE = process.env.APP_BASEURL || (functions as any).config?.().app?.baseurl || 'https://growgram-backend.web.app';
const VERIFY_PATH = '/auth/verify-email';

export const genVerify = functions
  .region('europe-west3')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res): Promise<void> => {
    try {
      if (req.method !== 'GET') { res.status(405).send('Method Not Allowed'); return; }
      if (!DEV_SECRET || String(req.query.key || '') !== DEV_SECRET) { res.status(403).send('Forbidden'); return; }

      const email = String(req.query.email || '').trim().toLowerCase();
      const uid   = String(req.query.uid || '').trim();

      let userId = uid;
      if (!userId && email) {
        const u = await admin.auth().getUserByEmail(email).catch(() => null);
        if (u) userId = u.uid;
      }
      if (!userId) { res.status(400).send('Bad Request: need uid or email'); return; }

      const token = generateToken({ userId, email: email || undefined });
      const verifyUrl = `${APP_BASE}${VERIFY_PATH}?token=${encodeURIComponent(token)}`;

      res.setHeader('Cache-Control', 'no-store');
      res.redirect(302, verifyUrl);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Error');
    }
  });