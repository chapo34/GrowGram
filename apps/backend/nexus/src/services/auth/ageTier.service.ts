// src/services/auth/ageTier.service.ts
//
// Bindeglied zwischen Firestore-User-Daten und der reinen Age-Logik
// aus src/utils/ageGate.ts. Hier wird NICHT entschieden, *wie* verifiziert
// wird (KJM, Ausweis etc.), sondern nur:
//   - UserDoc lesen
//   - relevante Felder extrahieren
//   - AgeTier berechnen
//   - Helper für "18+ verifiziert" bereitstellen

import { db } from "../../config/firebase.js";
import {
  deriveAgeTier,
  type AgeTier,
  type UserAgeSource,
} from "../../utils/ageGate.js";

export type AgeTierResult = {
  userId: string;
  tier: AgeTier;
  source: UserAgeSource | null;
};

/**
 * Firestore-User-Dokument auf das minimale `UserAgeSource` mappen,
 * das unsere Age-Gate-Logik braucht.
 */
function mapUserDocToAgeSource(
  snap: FirebaseFirestore.DocumentSnapshot
): UserAgeSource | null {
  if (!snap.exists) return null;
  const data = snap.data() as any;
  if (!data) return null;

  return {
    // Erwartet z.B. "2005-04-20"
    birthDate: data.birthDate ?? null,

    // Dein User-Doc hat meist isVerified oder emailVerified
    isVerified:
      typeof data.isVerified === "boolean"
        ? data.isVerified
        : typeof data.emailVerified === "boolean"
        ? data.emailVerified
        : null,

    // Compliance-Block (aus compliance.service / complianceController)
    compliance: data.compliance ?? null,

    // Starke Altersverifikation (KJM / Ausweis / VideoCheck etc.)
    // → können wir später strukturierter machen (z.B. ageVerification.status)
    ageVerifiedAt:
      typeof data.ageVerifiedAt === "string"
        ? data.ageVerifiedAt
        : typeof data.ageVerification?.verifiedAt === "string"
        ? data.ageVerification.verifiedAt
        : null,
  };
}

/**
 * Liest den User aus Firestore und berechnet das AgeTier.
 * Blockiert NICHT hart – wenn wir nichts wissen, kommt "UNKNOWN".
 */
export async function getUserAgeTier(userId: string): Promise<AgeTierResult> {
  const ref = db.collection("users").doc(userId);
  const snap = await ref.get();

  const source = mapUserDocToAgeSource(snap);
  const tier = deriveAgeTier(source);

  return {
    userId: ref.id,
    tier,
    source,
  };
}

/**
 * Fehlerklasse für "User ist nicht 18+ verifiziert".
 * Wird in requireAdultTier-Middleware benutzt.
 */
export class AdultVerificationRequiredError extends Error {
  code = "adult_verification_required" as const;
  status = 403 as const;

  constructor(message = "adult_verification_required") {
    super(message);
    this.name = "AdultVerificationRequiredError";
  }
}

/**
 * Stellt sicher, dass der User 18+ *verifiziert* ist.
 * Sonst wird `AdultVerificationRequiredError` geworfen.
 *
 * → Perfekt für Upload/Access von 18+ Only-Content.
 */
export async function assertAdultVerified(
  userId: string
): Promise<AgeTierResult> {
  const meta = await getUserAgeTier(userId);

  if (meta.tier !== "AGE18_VERIFIED") {
    throw new AdultVerificationRequiredError();
  }

  return meta;
}