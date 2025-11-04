// src/services/auth/password.service.ts
import bcrypt from 'bcryptjs';

const DEFAULT_ROUNDS = Number(process.env.PASSWORD_ROUNDS || 12);

export async function hashPassword(plain: string, rounds = DEFAULT_ROUNDS): Promise<string> {
  if (!plain || plain.length < 6) throw new Error('password_too_short');
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}