import * as functions from 'firebase-functions/v1';
import { initializeApp, getApps } from 'firebase-admin/app';

// Admin initialisieren (idempotent)
if (getApps().length === 0) {
  initializeApp();
}

// Express-App laden
import * as appModule from './app/app.js';
const appV1 = (appModule as any).app ?? (appModule as any).default ?? (appModule as any);

// Cloud Function (https) – Neue API v1
export const apiV1 = functions
  .region('europe-west3')
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onRequest(appV1);