import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();
const db = getFirestore();
const col = db.collection('users');

export type DbUser = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  emailLower: string;
  passwordHash?: string;
  city?: string | null;
  birthDate?: string | null;
  username?: string | null;
  usernameLower?: string | null;
  isVerified: boolean;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
};

export type NewUser = Omit<DbUser, 'createdAt' | 'updatedAt'>;

export async function createUser(data: NewUser): Promise<{ id: string } & DbUser> {
  const ts = FieldValue.serverTimestamp();
  const ref = await col.add({ ...data, createdAt: ts, updatedAt: ts });
  const snap = await ref.get();
  return { id: ref.id, ...(snap.data() as DbUser) };
}

export async function getUserByEmailLower(emailLower: string): Promise<({ id: string } & DbUser) | null> {
  const snap = await col.where('emailLower', '==', emailLower).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as DbUser) };
}

export async function isUsernameTaken(usernameLower: string): Promise<boolean> {
  const snap = await col.where('usernameLower', '==', usernameLower).limit(1).get();
  return !snap.empty;
}