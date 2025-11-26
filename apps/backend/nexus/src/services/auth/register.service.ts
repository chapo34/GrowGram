// src/services/auth/register.service.ts
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmailLower, isUsernameTaken } from '../../repositories/users.repo.js';
import { signAccessToken } from './jwt.service.js';
import {
  buildVerifyUrlForFrontend,
  buildVerifyUrlFromBackend,
  sendVerificationEmail,
} from './email.service.js';

type Input = {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  birthDate?: string | null;
  username?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._]{3,20}$/;

export async function register(input: Input): Promise<{ userId: string; verifyUrl: string }> {
  const email = String(input.email || '').trim();
  const password = String(input.password || '');

  if (!EMAIL_RE.test(email)) throw new Error('invalid_email');
  if (password.length < 8) throw new Error('weak_password');

  const emailLower = email.toLowerCase();
  const existing = await getUserByEmailLower(emailLower);
  if (existing) throw new Error('email_exists');

  // optionaler Username
  let username: string | null = input.username ?? null;
  let usernameLower: string | null = null;
  if (username && username.trim()) {
    username = username.trim();
    if (!USERNAME_RE.test(username)) throw new Error('invalid_username');
    usernameLower = username.toLowerCase();
    if (await isUsernameTaken(usernameLower)) throw new Error('username_exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // User persistieren (dein Repo erzeugt die ID)
  const saved = await createUser({
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    email,
    emailLower,
    passwordHash,
    city: input.city || null,
    birthDate: input.birthDate || null,
    username,
    usernameLower,
    isVerified: false,
  });

  // Verify-Token (eigenes JWT) – Ablauf konfigurierbar via VERIFY_EXPIRES (z.B. "1d")
  const verifyExpires = process.env.VERIFY_EXPIRES || '1d';
  const token = signAccessToken({ userId: saved.id, email: emailLower }, verifyExpires);

  // Bevorzugt hübsche Frontend-URL, sonst direkte Function-URL
  const verifyUrl =
    buildVerifyUrlForFrontend(token) ||
    buildVerifyUrlFromBackend(token);

  // E-Mail senden (nicht blockierend – Fehler loggen, Flow nicht abbrechen)
  try {
    await sendVerificationEmail({
      to: emailLower,
      firstName: input.firstName || 'Friend',
      verificationUrl: verifyUrl,
      userId: saved.id,                 // <-- jetzt korrekt typisiert
    });
  } catch (e: any) {
    console.warn('[register] verification email skipped/failed:', e?.message || e);
  }

  return { userId: saved.id, verifyUrl };
}