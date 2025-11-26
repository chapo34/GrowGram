import type { Express, Router } from "express";
import { Router as ExpressRouter } from "express";

/**
 * Kompatibilitäts-Shim: Früher wurden hier Routen aggregiert.
 * Jetzt registrieren wir zentral in src/app/app.ts. Dieser Shim hält Builds grün.
 */

export function createAuthRouter(): Router {
  return ExpressRouter(); // leerer Router
}

export function mountAuth(app: Express): Express {
  // nichts zu tun – echte Routen sind in src/app/app.ts gemountet
  return app;
}

export default mountAuth;