// functions/src/utils/admin.ts
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';

let appInstance: App | null = null;

export function ensureApp(): App {
  if (!getApps().length) {
    appInstance = initializeApp();
  } else {
    appInstance = getApps()[0]!;
  }
  return appInstance!;
}

export function getDB(): Firestore {
  return getFirestore(ensureApp());
}

export function getAdminAuth(): Auth {
  return getAuth(ensureApp());
}

export function getAdminStorage(): Storage {
  return getStorage(ensureApp());
}