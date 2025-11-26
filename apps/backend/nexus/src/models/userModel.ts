// src/models/userModel.ts
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

/** Firestore-Speicherform (ohne id) */
export type UserDoc = {
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string;
  city?: string;
  birthDate?: string; // ISO YYYY-MM-DD (Absicht!)
  bio?: string;
  avatarUrl?: string;
  privateProfile?: boolean;
  hideSensitive?: boolean;
  pushOptIn?: boolean;

  isVerified?: boolean; // E-Mail verifiziert

  compliance?: {
    agreed?: boolean;
    over18?: boolean;
    version?: string;
    agreedAt?: Timestamp;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** Domain-Form (App-Schicht) */
export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string;
  city?: string;
  birthDate?: string; // ISO YYYY-MM-DD
  bio?: string;
  avatarUrl?: string;
  privateProfile?: boolean;
  hideSensitive?: boolean;
  pushOptIn?: boolean;

  isVerified?: boolean;
  compliance?: {
    agreed?: boolean;
    over18?: boolean;
    version?: string;
    agreedAt?: string; // ISO
  };

  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const toISO = (t?: Timestamp | null) => (t ? t.toDate().toISOString() : undefined);

export const userConverter = {
  toFirestore(u: Partial<User>): DocumentData {
    const now = FieldValue.serverTimestamp();
    const doc: Partial<UserDoc> = {
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email!,
      username: u.username,
      city: u.city,
      birthDate: u.birthDate,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      privateProfile: u.privateProfile ?? false,
      hideSensitive: u.hideSensitive ?? false,
      pushOptIn: u.pushOptIn ?? false,
      isVerified: u.isVerified ?? false,
      compliance: u.compliance
        ? {
            agreed: u.compliance.agreed ?? true,
            over18: u.compliance.over18 ?? true,
            version: u.compliance.version ?? '1.0.0',
            // agreedAt nur setzen, wenn nicht schon vorhanden
            agreedAt: Timestamp.fromDate(new Date(u.compliance.agreedAt || Date.now())),
          }
        : undefined,
      updatedAt: now as any,
      // createdAt nur bei Create – Repositories sollten dies steuern
      ...(u.createdAt ? {} : { createdAt: now as any }),
    };
    return doc as DocumentData;
  },

  fromFirestore(snap: QueryDocumentSnapshot<UserDoc>): User {
    const d = snap.data();
    return {
      id: snap.id,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      username: d.username,
      city: d.city,
      birthDate: d.birthDate,
      bio: d.bio,
      avatarUrl: d.avatarUrl,
      privateProfile: d.privateProfile ?? false,
      hideSensitive: d.hideSensitive ?? false,
      pushOptIn: d.pushOptIn ?? false,
      isVerified: d.isVerified ?? false,
      compliance: d.compliance
        ? {
            agreed: d.compliance.agreed ?? true,
            over18: d.compliance.over18 ?? true,
            version: d.compliance.version ?? '1.0.0',
            agreedAt: toISO(d.compliance.agreedAt),
          }
        : undefined,
      createdAt: toISO(d.createdAt) || new Date(0).toISOString(),
      updatedAt: toISO(d.updatedAt) || new Date(0).toISOString(),
    };
  },
};

export const usersCol = () => db.collection('users').withConverter(userConverter);
export const userRef = (id: string) => usersCol().doc(id);