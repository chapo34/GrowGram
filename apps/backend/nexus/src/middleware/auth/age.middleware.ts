// src/middleware/age.middleware.ts
//
// Thin-Alias für Age-Middleware.
// Falls irgendwo im Code `age.middleware` importiert wird,
// wird alles an ageTier.middleware.ts weitergereicht.

export {
  attachAgeTier,
  requireAdultTier,
} from "./ageTier.middleware.js";