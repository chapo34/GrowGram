// src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/firebase.js';
import { generateToken } from '../utils/jwtUtils.js';
import { sendVerificationEmail } from '../services/emailService.js';
import type { AuthedRequest } from '../middleware/authMiddleware.js';

const usersCollection = db.collection('users');

// Helper: Username normalisieren (lowercase, trim)
const norm = (s: string) => s.trim().toLowerCase();

/** Registrierung */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, city, birthDate, username } = req.body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      city: string;
      birthDate: string;
      username?: string;
    };

    // E-Mail einzigartig?
    const existingMail = await usersCollection.where('email', '==', email).limit(1).get();
    if (!existingMail.empty) {
      return res.status(400).json({ message: 'E-Mail bereits registriert.' });
    }

    // Optionaler Username: Validierung & Einzigartigkeit
    let usernameClean: string | undefined;
    let usernameLower: string | undefined;
    if (username && username.trim()) {
      const u = username.trim();
      const valid = /^[a-zA-Z0-9._]{3,20}$/.test(u);
      if (!valid) {
        return res.status(400).json({
          message:
            'Ungültiger Benutzername. Erlaubt sind 3–20 Zeichen: Buchstaben, Zahlen, Punkt, Unterstrich.',
        });
      }
      usernameClean = u;
      usernameLower = norm(u);

      const existingUser = await usersCollection.where('usernameLower', '==', usernameLower).limit(1).get();
      if (!existingUser.empty) {
        return res.status(400).json({ message: 'Benutzername bereits vergeben.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRef = await usersCollection.add({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      city,
      birthDate,
      isVerified: false,
      createdAt: new Date().toISOString(),
      ...(usernameClean ? { username: usernameClean, usernameLower } : {}),
    });

    const token = generateToken({ userId: userRef.id, email, expiresIn: '1d' });
    const verificationUrl = `${process.env.VERIFICATION_URL}?token=${token}`;

    await sendVerificationEmail({ to: email, firstName, verificationUrl });

    return res
      .status(201)
      .json({ message: 'Registrierung erfolgreich. Bitte E-Mail verifizieren.' });
  } catch (err) {
    console.error('Fehler bei Registrierung:', err);
    return res.status(500).json({ message: 'Interner Serverfehler.' });
  }
};

/** Login (E-Mail ODER Benutzername) */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const identifierRaw =
      (req.body.identifier as string | undefined) ??
      (req.body.email as string | undefined);

    const { password } = req.body as { password: string };

    if (!identifierRaw || !password) {
      return res.status(400).json({ message: 'E-Mail/Benutzername und Passwort erforderlich.' });
    }

    const identifier = identifierRaw.trim();
    const snapshot = identifier.includes('@')
      ? await usersCollection.where('email', '==', identifier).limit(1).get()
      : await usersCollection.where('usernameLower', '==', norm(identifier)).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data() as {
      password: string;
      isVerified: boolean;
      firstName: string;
      lastName: string;
      city?: string;
      birthDate?: string;
      email: string;
      username?: string;
    };

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Falsches Passwort.' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'E-Mail nicht verifiziert.' });
    }

    const token = generateToken({ userId: userDoc.id, email: user.email, expiresIn: '7d' });

    return res.status(200).json({
      token,
      user: {
        id: userDoc.id,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city,
        birthDate: user.birthDate,
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    console.error('Login fehlgeschlagen:', err);
    return res.status(500).json({ message: 'Login fehlgeschlagen.' });
  }
};

/** /me – benötigt auth-Middleware */
export const me = async (req: AuthedRequest, res: Response) => {
  try {
    const uid = req.user?.userId;
    if (!uid) return res.status(401).json({ message: 'Nicht autorisiert.' });

    const snap = await usersCollection.doc(uid).get();
    if (!snap.exists) return res.status(404).json({ message: 'User nicht gefunden.' });

    const u = snap.data()!;
    return res.json({
      id: snap.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      username: u.username,
      city: u.city,
      birthDate: u.birthDate,
    });
  } catch (e) {
    console.error('Fehler /me:', e);
    return res.status(500).json({ message: 'Fehler beim Laden.' });
  }
};