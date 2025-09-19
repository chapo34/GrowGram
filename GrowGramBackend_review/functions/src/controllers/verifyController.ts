// src/controllers/verifyController.ts
import { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersCollection = db.collection('users');

// Helper-Funktion zum Senden von HTML-Seiten
function sendHtml(
  res: Response,
  file: 'verify-success.html' | 'verify-already.html' | 'verify-error.html'
) {
  res.set('Cache-Control', 'no-store');
  return res.sendFile(path.join(__dirname, '..', 'public', file));
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return sendHtml(res, 'verify-error.html');
    }

    // Versuche, Token zu verifizieren
    let payload: any;
    try {
      payload = verifyToken(token);
    } catch {
      // Ungültig oder abgelaufen → "bereits verifiziert"
      return sendHtml(res, 'verify-already.html');
    }

    if (!payload || typeof payload === 'string' || !payload.userId) {
      return sendHtml(res, 'verify-already.html');
    }

    const userRef = usersCollection.doc(payload.userId);
    const snap = await userRef.get();

    if (!snap.exists) {
      return sendHtml(res, 'verify-error.html');
    }

    const user = snap.data() || {};
    if (user.isVerified) {
      // Bereits verifiziert → schicke direkt die HTML-Seite
      return sendHtml(res, 'verify-already.html');
    }

    // Jetzt verifizieren
    await userRef.update({ isVerified: true });
    return sendHtml(res, 'verify-success.html');

  } catch (err) {
    console.error('[verify] Fehler:', err);
    // Im Zweifel lieber "bereits verifiziert" anzeigen als einen Error
    return sendHtml(res, 'verify-already.html');
  }
}