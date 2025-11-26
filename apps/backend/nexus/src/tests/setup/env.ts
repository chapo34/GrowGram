// Setzt ENV *bevor* App/Firestore/Admin importiert werden.
// So nutzen Admin SDK & deine Config automatisch die Emulatoren.

process.env.NODE_ENV ??= 'test';

// Projekt/Region (kannst du auch via Script überschreiben)
process.env.GCLOUD_PROJECT ??= 'growgram-backend';
process.env.FIREBASE_PROJECT_ID ??= process.env.GCLOUD_PROJECT;
process.env.REGION ??= 'europe-west3';

// Auth/Firestore Emulator (Standard-Ports)
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';

// E-Mail im Test niemals echt senden
process.env.EMAIL_DEV_MODE = '1';

// JWT Secrets/Expires (Tests)
process.env.JWT_SECRET ??= 'dev-secret';
process.env.JWT_EXPIRES ??= '1d';
process.env.VERIFY_EXPIRES ??= '24h';

// Optional: hübsche Frontend-URL (für Verify-Links via Hosting-Redirects)
// Falls du sie nicht brauchst, einfach weglassen:
process.env.FRONTEND_HOST ??= '';
process.env.FRONTEND_VERIFY_PATH ??= '/verify-email';

// API-Key für Firebase Auth *nur* für PROD nötig – der Emulator ignoriert das.
// Lass ihn im Test leer; unser Code fällt automatisch auf Emulator-Pfade zurück.