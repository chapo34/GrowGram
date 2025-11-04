import { db, nowISO } from '../config/firebase.js';

export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  city?: string;
  birthDate?: string;
  bio?: string;
  avatarUrl?: string;
  privateProfile?: boolean;
  hideSensitive?: boolean;
  pushOptIn?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const USERS = db.collection('users');

function mapUser(doc: FirebaseFirestore.DocumentSnapshot): User {
  return { id: doc.id, ...(doc.data() as any) };
}

export async function createUser(id: string, data: Partial<User>) {
  const payload = { ...data, createdAt: nowISO(), updatedAt: nowISO() };
  await USERS.doc(id).set(payload, { merge: true });
  return { id, ...payload } as User;
}
export async function getUserByEmail(email: string) {
  const q = await USERS.where('email', '==', String(email)).limit(1).get();
  return q.empty ? null : mapUser(q.docs[0]);
}
export async function getUserById(id: string) {
  const snap = await USERS.doc(id).get();
  return snap.exists ? mapUser(snap) : null;
}
export async function updateUser(id: string, patch: Partial<User>) {
  await USERS.doc(id).set({ ...patch, updatedAt: nowISO() }, { merge: true });
}