// src/models/userModel.ts
import admin from 'firebase-admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  city: string;
  isVerified: boolean;
  createdAt: string;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const usersRef = admin.firestore().collection('users');
  const snapshot = await usersRef.where('email', '==', email).limit(1).get();

  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
};