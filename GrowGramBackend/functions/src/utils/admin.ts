// functions/src/utils/admin.ts
import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

let appInstance: App | null = null;

export function ensureApp(): App {
  if (!appInstance) {
    const apps = getApps();
    appInstance = apps.length ? apps[0]! : initializeApp();
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