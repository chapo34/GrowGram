import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

import { db } from '../config/firebase.js';
import { generateResetToken, verifyResetToken } from '../utils/jwtUtils.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersCollection = db.collection('users');

// kleine Helper für HTML
const sendHtml = (
  res: Response,
  file: 'reset-form.html' | 'reset-success.html' | 'reset-error.html'
) => res.sendFile(path.join(__dirname, '..', 'public', file));

/**
 * POST /auth/request-password-reset
 * Body: { email }
 * Wirkung: sendet E‑Mail mit Reset‑Link (?token=...)
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };

    // User lookup (nicht verraten, ob es ihn gibt)
    const snap = await usersCollection.where('email', '==', email).limit(1).get();
    if (snap.empty) {
      return res
        .status(200)
        .json({ message: 'Wenn es ein Konto gibt, wurde eine E‑Mail gesendet.' });
    }

    const userDoc = snap.docs[0];
    const user = userDoc.data() as any;
    const userId = userDoc.id;

    // kurzes Reset‑Token (Default 15m, aus .env: RESET_TOKEN_EXPIRES)
    const resetToken = generateResetToken({
      userId,
      email,
      expiresIn: process.env.RESET_TOKEN_EXPIRES || '15m',
    });

    // Link (Basis aus .env: RESET_URL → /auth/reset-password)
    const base = process.env.RESET_URL!;
    const resetUrl = `${base}?token=${encodeURIComponent(resetToken)}`;

    await sendPasswordResetEmail({
      to: email,
      firstName: user.firstName || 'Freund',
      resetUrl,
      appUrl: process.env.APP_URL || '',
    });

    return res
      .status(200)
      .json({ message: 'Falls ein Konto existiert, wurde eine E‑Mail gesendet.' });
  } catch (err) {
    console.error('[password] request error', err);
    return res.status(500).json({ message: 'Fehler beim Anfordern des Passwort-Resets.' });
  }
};

/**
 * GET /auth/reset-password?token=...
 * Wirkung: zeigt HTML‑Form (deine Datei), Token bleibt in der URL
 */
export const showResetForm = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') return sendHtml(res, 'reset-error.html');

    // Kurz prüfen – volle Prüfung erst beim POST
    try {
      verifyResetToken(token);
    } catch {
      return sendHtml(res, 'reset-error.html');
    }

    return sendHtml(res, 'reset-form.html');
  } catch (err) {
    console.error('[password] show form error', err);
    return sendHtml(res, 'reset-error.html');
  }
};

/**
 * POST /auth/reset-password
 * Body: { token, newPassword }
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token oder Passwort fehlt.' });
    }

    const payload = verifyResetToken(token); // prüft auch purpose === 'reset'
    const userRef = usersCollection.doc(payload.userId);
    const snap = await userRef.get();
    if (!snap.exists) return res.status(404).json({ message: 'Benutzer nicht gefunden.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await userRef.update({
      password: hashed,
      passwordUpdatedAt: new Date().toISOString(),
    });

    // Optional: HTML-Seite ausliefern:
    // return sendHtml(res, 'reset-success.html');

    return res.status(200).json({ message: 'Passwort wurde erfolgreich zurückgesetzt.' });
  } catch (err) {
    console.error('[password] reset error', err);
    return res.status(400).json({ message: 'Passwort konnte nicht gesetzt werden.' });
  }
};