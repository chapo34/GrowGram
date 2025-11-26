// src/services/feed/ageFilter.service.ts
//
// Hilfsfunktionen, um Feed-Posts anhand des AgeTier zu filtern.
// Nutzt die zentrale AgeGate-Logik aus src/utils/ageGate.ts.

import {
  type AgeTier,
  type PostAgeMeta,
  isPostVisibleForAgeTier,
  normalizePostAgeMeta,
} from "../../utils/ageGate.js";

/**
 * Minimaler Typ, den ein Post haben muss, damit wir Age-Filter anwenden können.
 * Du kannst deinen bestehenden Post-Typ einfach "erweitern" (intersection).
 */
export interface AgeAwarePost {
  ageMeta?: PostAgeMeta | null;

  // optionale Felder direkt am Post-Dokument:
  minAge?: number | null;            // 16 | 18
  adultOnly?: boolean | null;        // true → nur 18+ VERIFIED
  audience?: "ALL" | "16+" | "18+" | null;
  tags?: string[] | null;            // für spätere Feinfilter (#bong, #dab, ...)

  // Rest: beliebige weitere Felder (caption, media, etc.)
  [key: string]: any;
}

/**
 * PostAgeMeta aus einem Post ableiten.
 * Falls ageMeta bereits existiert, wird es mit den Top-Level-Feldern gemerged.
 */
function toPostAgeMeta(post: AgeAwarePost): PostAgeMeta {
  const base: PostAgeMeta = {
    minAge:
      typeof post.minAge === "number"
        ? post.minAge
        : post.ageMeta?.minAge ?? null,
    adultOnly:
      typeof post.adultOnly === "boolean"
        ? post.adultOnly
        : post.ageMeta?.adultOnly ?? null,
    audience: (post.audience as any) ?? post.ageMeta?.audience ?? null,
    tags: post.tags ?? post.ageMeta?.tags ?? null,
  };

  // normalize erzwingt saubere Werte (minAge ∈ {16,18}, audience in {ALL,16+,18+}, ...)
  return normalizePostAgeMeta(base);
}

/**
 * Filtert eine Post-Liste gemäß AgeTier.
 * - adultOnly → nur AGE18_VERIFIED
 * - 18+ → AGE18_UNVERIFIED oder AGE18_VERIFIED
 * - 16+ → alle, die nicht als 18+ markiert sind
 */
export function filterPostsForTier<T extends AgeAwarePost>(
  posts: T[],
  tier: AgeTier
): T[] {
  if (!posts || posts.length === 0) return posts;

  return posts.filter((post) => {
    const meta = toPostAgeMeta(post);
    return isPostVisibleForAgeTier(meta, tier);
  });
}