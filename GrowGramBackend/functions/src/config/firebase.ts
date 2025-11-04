// functions/src/config/firebase.ts
// Kompatibilitäts-Adapter für firebase-admin v11 UND v12
// -> Bestehender Code kann weiterhin "admin.firestore()", "admin.auth()", "admin.storage().bucket()"
//    und "admin.firestore.{FieldValue,Timestamp}" benutzen – ohne Änderungen an anderen Dateien.

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

// Einmalige Initialisierung (ADC im Emulator/Cloud)
if (getApps().length === 0) {
  initializeApp();
}

/** v12 Handles (funktionieren auch, wenn v11 installiert ist) */
const db = getFirestore();
const authAdmin = getAuth();
const storage = getStorage();
const bucket: Bucket = storage.bucket();

/** Kompatible "admin"-Attrappe mit denselben Aufrufen wie früher */
const firestoreCompat = Object.assign(
  () => db,                 // erlaubt admin.firestore()
  { FieldValue, Timestamp } // erlaubt admin.firestore.FieldValue / Timestamp
);

// Achtung: TypeScript: wir typisieren die Attrappe bewusst als any,
// damit alle alten Aufrufe zugelassen sind (admin.firestore(), admin.auth(), admin.storage().bucket()).
export const admin: any = {
  firestore: firestoreCompat,
  auth: () => authAdmin,
  storage: () => storage,
};

// Zusätzlich die modernen Einzel-Exporte – falls du sie irgendwo direkt verwendest:
export { db, authAdmin, storage, bucket, FieldValue, Timestamp };

// Einheitliche Region-Konstante
export const REGION = 'europe-west3';