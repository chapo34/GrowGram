// src/models/userModel.ts
import { admin } from '../config/firebase.js';

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  // password wird NICHT in Firestore abgelegt – daher optional oder entfernen:
  password?: string;
  birthDate?: string;
  city?: string;
  isVerified?: boolean;
  createdAt?: string | FirebaseFirestore.Timestamp | null;
  username?: string;
  avatarUrl?: string;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const usersRef = admin.firestore().collection('users');
  const snap = await usersRef.where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as any) } as User;
};