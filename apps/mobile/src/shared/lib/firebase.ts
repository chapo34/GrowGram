// src/shared/lib/firebase.ts
import Constants from 'expo-constants';
import {
  initializeApp,
  getApp,
  getApps,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

type FirebaseEnvConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readEnv(keyEnv: string, extraKey: string): string {
  const fromEnv = process.env[keyEnv];
  const extra =
    (Constants.expoConfig?.extra as any) ||
    (Constants as any).manifest?.extra ||
    (Constants as any).manifest2?.extra;

  const fromExtra = extra?.[extraKey];

  const value = (fromEnv ?? fromExtra) as string | undefined;

  if (!value || !String(value).trim()) {
    throw new Error(
      `[firebase] Fehlende Konfiguration: ${keyEnv} (oder extra.${extraKey}).` +
        ' Bitte in app.config.ts / app.json und/oder EXPO_PUBLIC_* setzen.'
    );
  }

  return String(value).trim();
}

function getFirebaseEnvConfig(): FirebaseEnvConfig {
  return {
    apiKey: readEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY'),
    authDomain: readEnv(
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'FIREBASE_AUTH_DOMAIN'
    ),
    projectId: readEnv(
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_PROJECT_ID'
    ),
    storageBucket: readEnv(
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'FIREBASE_STORAGE_BUCKET'
    ),
    messagingSenderId: readEnv(
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_MESSAGING_SENDER_ID'
    ),
    appId: readEnv('EXPO_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID'),
  };
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;

  if (getApps().length > 0) {
    firebaseApp = getApp();
    return firebaseApp;
  }

  const env = getFirebaseEnvConfig();
  const options: FirebaseOptions = {
    apiKey: env.apiKey,
    authDomain: env.authDomain,
    projectId: env.projectId,
    storageBucket: env.storageBucket,
    messagingSenderId: env.messagingSenderId,
    appId: env.appId,
  };

  firebaseApp = initializeApp(options);

  if (__DEV__) {
    console.log('[firebase] App initialisiert für Projekt:', env.projectId);
  }

  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;

  const app = getFirebaseApp();

  // Einfaches getAuth – ohne RN-Persistence-Magie
  firebaseAuth = getAuth(app);

  return firebaseAuth;
}

export const app: FirebaseApp = getFirebaseApp();
export const auth: Auth = getFirebaseAuth();