// src/types/age.ts

/** Altersstufe des Users */
export type AgeTier = "16plus" | "18plus";

/** Altersrating von Content (z.B. Posts, Videos) */
export type AgeRating = "16plus" | "18plus";

/**
 * Sicherer Default:
 * - Unklassifizierter Content wird wie 18+ behandelt.
 *   (lieber zu streng als zu locker => rechtlich besser)
 */
export const DEFAULT_POST_RATING: AgeRating = "18plus";

/**
 * Darf ein User mit Tier X Content mit Rating Y sehen?
 * - 18plus-User: alles
 * - 16plus-User: nur 16plus
 */
export function canUserSeeRating(tier: AgeTier, rating: AgeRating): boolean {
  if (tier === "18plus") return true;
  // tier === "16plus"
  return rating === "16plus";
}

/**
 * Hilfsfunktion: wenn ein Rating fehlt oder ungültig ist,
 * behandeln wir den Post aus Sicherheitsgründen als 18+.
 */
export function normalizeAgeRating(raw: any): AgeRating {
  if (raw === "16plus" || raw === "18plus") return raw;
  return DEFAULT_POST_RATING;
}