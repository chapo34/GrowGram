// src/controllers/authController.ts
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as functionsConf from 'firebase-functions/v1';
import { db, admin } from '../config/firebase.js';
import { generateToken } from '../utils/jwtUtils.js';
import type { AuthedRequest } from '../middleware/authMiddleware.js';

// ---- Firestore ----
const users = db.collection('users');

// ---- Helpers ----
const norm = (s: unknown) => String(s ?? '').trim();
const lower = (s: unknown) => norm(s).toLowerCase();
const isValidUsername = (u: string) => /^[a-zA-Z0-9._]{3,20}$/.test(u);

// Zentrale Konfiguration für Links/URLs
function getConfig() {
  const c: any = (functionsConf as any).config?.() ?? {};

  // Bevorzugt API_BASE_URL aus ENV oder functions:config:set app.api_baseurl="https://.../api"
  const apiBase = (
    c?.app?.api_baseurl ||
    process.env.API_BASE_URL ||
    'https://europe-west3-growgram-backend.cloudfunctions.net/api'
  ).replace(/\/$/, '');

  const verifyPath = c?.app?.verifypath || process.env.VERIFY_PATH || '/auth/verify-email';

  // Falls VERIFICATION_URL gesetzt ist, hat diese Vorrang (muss auf /auth/verify-email zeigen)
  const verificationUrl =
    (process.env.VERIFICATION_URL && process.env.VERIFICATION_URL.replace(/\/$/, '')) ||
    `${apiBase}${verifyPath}`;

  return { apiBase, verifyPath, verificationUrl };
}

/** POST /auth/register
 *  Erstellt den User, setzt isVerified=false und sendet eine Verify-Mail.
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      city,
      birthDate,
      username,
    } = (req.body || {}) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      city?: string;
      birthDate?: string;
      username?: string;
    };

    // Minimalvalidierung
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Pflichtfelder fehlen.' });
    }
    if (norm(password).length < 8) {
      return res.status(400).json({ message: 'Passwort muss mindestens 8 Zeichen haben.' });
    }

    const emailLower = lower(email);

    // E-Mail eindeutig?
    const byMail = await users.where('emailLower', '==', emailLower).limit(1).get();
    if (!byMail.empty) {
      return res.status(400).json({ message: 'E-Mail bereits registriert.' });
    }

    // Optionaler Username
    let usernameClean: string | undefined;
    let usernameLower: string | undefined;
    if (username && norm(username)) {
      const u = norm(username);
      if (!isValidUsername(u)) {
        return res.status(400).json({
          message: 'Ungültiger Benutzername. Erlaubt: 3–20 Zeichen [a-zA-Z0-9._].',
        });
      }
      usernameClean = u;
      usernameLower = lower(u);

      const byUsername = await users.where('usernameLower', '==', usernameLower).limit(1).get();
      if (!byUsername.empty) {
        return res.status(400).json({ message: 'Benutzername bereits vergeben.' });
      }
    }

    // Hashen & speichern
    const hashedPassword = await bcrypt.hash(password, 12);
    const ts = admin.firestore.FieldValue.serverTimestamp();

    const userRef = await users.add({
      firstName: norm(firstName),
      lastName: norm(lastName),
      city: city ?? null,
      birthDate: birthDate ?? null,
      email: norm(email),
      emailLower,
      password: hashedPassword,
      isVerified: false,
      createdAt: ts,
      updatedAt: ts,
      ...(usernameClean ? { username: usernameClean, usernameLower } : {}),
    });

    // Verify-Token für 1 Tag (via jwtUtils)
    const token = generateToken({
      userId: userRef.id,
      email: emailLower,
      expiresIn: '1d',
    });

    const { verificationUrl } = getConfig();
    const verifyUrl = `${verificationUrl}?token=${encodeURIComponent(token)}`;

    // Mail versenden (lazy import, damit keine Zyklusabhängigkeit)
    try {
      const { sendVerificationEmail } = await import('../services/emailService.js');
      await sendVerificationEmail({
        to: emailLower,
        firstName: norm(firstName),
        verificationUrl: verifyUrl,
      });
    } catch (e) {
      // Registrierung nicht blockieren, nur warnen
      console.warn('[register] sendVerificationEmail warn:', e);
    }

    return res.status(201).json({
      message: 'Registrierung erfolgreich. Bitte E-Mail verifizieren.',
      verifyUrl, // für QA gut; in Produktion ggf. entfernen
    });
  } catch (err) {
    console.error('[register] error:', err);
    return res.status(500).json({ message: 'Interner Serverfehler.' });
  }
};

/** POST /auth/login  (identifier=E-Mail ODER Benutzername) */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const identifierRaw =
      (req.body.identifier as string | undefined) ??
      (req.body.email as string | undefined);
    const { password } = (req.body || {}) as { password?: string };

    if (!identifierRaw || !password) {
      return res.status(400).json({ message: 'E-Mail/Benutzername und Passwort erforderlich.' });
    }

    const identifier = norm(identifierRaw);
    const byEmail = identifier.includes('@');

    const snap = byEmail
      ? await users.where('emailLower', '==', lower(identifier)).limit(1).get()
      : await users.where('usernameLower', '==', lower(identifier)).limit(1).get();

    if (snap.empty) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
    }

    const userDoc = snap.docs[0];
    const u = userDoc.data() as any;

    const passOk = await bcrypt.compare(password, String(u.password || ''));
    if (!passOk) return res.status(401).json({ message: 'Ungültige Zugangsdaten.' });

    if (!u.isVerified) {
      return res.status(403).json({ message: 'E-Mail nicht verifiziert.' });
    }

    const token = generateToken({
      userId: userDoc.id,
      email: String(u.emailLower || u.email || '').toLowerCase(),
      expiresIn: '7d',
    });

    return res.status(200).json({
      token,
      user: {
        id: userDoc.id,
        firstName: u.firstName,
        lastName: u.lastName,
        city: u.city ?? null,
        birthDate: u.birthDate ?? null,
        email: u.email,
        username: u.username ?? null,
        avatarUrl: u.avatarUrl ?? null,
      },
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ message: 'Login fehlgeschlagen.' });
  }
};

/** GET /auth/me  (geschützt) */
export const me = async (req: AuthedRequest, res: Response) => {
  try {
    const uid = req.user?.userId;
    if (!uid) return res.status(401).json({ message: 'Nicht autorisiert.' });

    const snap = await users.doc(uid).get();
    if (!snap.exists) return res.status(404).json({ message: 'User nicht gefunden.' });

    const u = snap.data()!;
    return res.json({
      id: snap.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      username: u.username ?? null,
      city: u.city ?? null,
      birthDate: u.birthDate ?? null,
      avatarUrl: u.avatarUrl ?? null,
    });
  } catch (e) {
    console.error('[me] error:', e);
    return res.status(500).json({ message: 'Fehler beim Laden.' });
  }
};

/** POST /auth/resend-verification  (optional) */
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const email = lower((req.body || {}).email);
    if (!email) return res.status(400).json({ message: 'E-Mail fehlt.' });

    const snap = await users.where('emailLower', '==', email).limit(1).get();
    if (snap.empty) return res.status(404).json({ message: 'Benutzer nicht gefunden.' });

    const doc = snap.docs[0];
    const u = doc.data() as any;
    if (u.isVerified) return res.status(200).json({ message: 'Bereits verifiziert.' });

    const token = generateToken({ userId: doc.id, email, expiresIn: '1d' });
    const { verificationUrl } = getConfig();
    const verifyUrl = `${verificationUrl}?token=${encodeURIComponent(token)}`;

    try {
      const { sendVerificationEmail } = await import('../services/emailService.js');
      await sendVerificationEmail({
        to: email,
        firstName: norm(u.firstName || 'Friend'),
        verificationUrl: verifyUrl,
      });
    } catch (e) {
      console.warn('[resendVerification] email warn:', e);
    }

    return res.status(200).json({ message: 'Bestätigungs-E-Mail gesendet.' });
  } catch (e) {
    console.error('[resendVerification] error:', e);
    return res.status(500).json({ message: 'Fehler beim Versand.' });
  }
};