// src/services/auth/ageVerification.service.ts
//
// Zentrale Service-Logik für Altersverifikation (18+):
//  - Admin-/Dev-Flag (CLI, Admin-API)
//  - Externe Provider (KJM-ID, ID-Check, etc.)
//  - Schreibt ageVerifiedAt + ageVerification-* Felder ins User-Dokument
//
// WICHTIG: Nur hier wird AGE18_VERIFIED "scharf" gesetzt.
//          → ageGate.ts erkennt das dann über ageVerifiedAt.

import { db, FieldValue } from "../../config/firebase.js";

/**
 * Mögliche Provider – du kannst später echte Namen ergänzen.
 * DEV_MANUAL   → CLI / Admin-Endpoint
 * KJM_PROVIDER → echter KJM-konformer Dienst (ID-Check, Videoident, etc.)
 */
export type AgeVerificationProvider =
  | "DEV_MANUAL"
  | "KJM_PROVIDER"
  | "ID_CHECK"
  | "UNKNOWN";

/**
 * Shape des ageVerification-Feldes im User-Dokument.
 */
export interface AgeVerificationRecord {
  provider: string;
  method: string;
  reference: string | null;
  status: "verified" | "failed" | "pending";
  verifiedAt: string | null; // ISO, wenn verified
  updatedAt: FirebaseFirestore.FieldValue;
  raw?: unknown;
}

/**
 * Payload für Admin-/Dev-Markierung (CLI, Admin-API).
 */
export interface MarkUserAgeVerifiedInput {
  userId: string;
  provider: string;
  method: string;
  reference?: string;
}

/**
 * Payload für externe Provider-Webhooks.
 */
export interface ProviderVerificationPayload {
  userId: string;
  provider: string;
  method: string;
  reference?: string;
  status: "verified" | "failed" | "pending";
  rawPayload?: unknown;
}

/**
 * Interne Helper-Funktion: UserRef holen.
 */
function userDocRef(userId: string) {
  return db.collection("users").doc(userId);
}

/**
 * Setzt den User hart auf "18+ verifiziert".
 *
 * - setzt ageVerifiedAt (ISO-String)
 * - setzt ageVerification (Status + Meta)
 * - setzt ageTier = "18plus" (coarse Feld für einfachere Queries)
 *
 * Wird verwendet von:
 *  - Admin-Controller (adminMarkAgeVerified)
 *  - completeAgeVerificationFromProvider bei status === "verified"
 */
export async function markUserAgeVerified(
  input: MarkUserAgeVerifiedInput
): Promise<void> {
  const { userId, provider, method, reference } = input;
  if (!userId) throw new Error("userId is required for markUserAgeVerified");

  const userRef = userDocRef(userId);
  const nowIso = new Date().toISOString();

  const record: AgeVerificationRecord = {
    provider,
    method,
    reference: reference ?? null,
    status: "verified",
    verifiedAt: nowIso,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await userRef.set(
    {
      ageVerifiedAt: nowIso, // ← Triggert in ageGate.ts AGE18_VERIFIED
      ageVerification: record,
      ageTier: "18plus", // coarse Feld (wird in deriveAgeTier zusätzlich geprüft)
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Wird vom externen Provider-Webhook aufgerufen.
 *
 * - status !== "verified" → wir loggen den Versuch, setzen aber KEIN ageVerifiedAt
 * - status === "verified" → wir rufen markUserAgeVerified() und loggen zusätzlich rawPayload
 */
export async function completeAgeVerificationFromProvider(
  payload: ProviderVerificationPayload
): Promise<{ ok: boolean; status: AgeVerificationRecord["status"] }> {
  const {
    userId,
    provider,
    method,
    reference,
    status,
    rawPayload,
  } = payload;

  if (!userId) throw new Error("userId is required in provider payload");

  const normalizedStatus: AgeVerificationRecord["status"] =
    status === "verified"
      ? "verified"
      : status === "pending"
      ? "pending"
      : "failed";

  const userRef = userDocRef(userId);

  // Immer: Audit-Record im User-Dokument setzen (auch bei failed/pending)
  const baseRecord: AgeVerificationRecord = {
    provider,
    method,
    reference: reference ?? null,
    status: normalizedStatus,
    verifiedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // rawPayload (z.B. JSON vom Provider) optional mergen
  const toMerge: any = {
    ageVerification: {
      ...baseRecord,
      ...(rawPayload ? { raw: rawPayload } : {}),
    },
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Wenn wirklich verifiziert → zusätzlich ageVerifiedAt setzen
  if (normalizedStatus === "verified") {
    const nowIso = new Date().toISOString();
    toMerge.ageVerification.verifiedAt = nowIso;
    toMerge.ageVerifiedAt = nowIso;
    toMerge.ageTier = "18plus";
  }

  await userRef.set(toMerge, { merge: true });

  return { ok: normalizedStatus === "verified", status: normalizedStatus };
}

/**
 * Platzhalter für "Verifikation starten".
 *
 * Idee:
 *  - Du schickst User zu einem externen Anbieter (KJM-konform),
 *  - der ruft dann deinen Webhook auf (completeAgeVerificationFromProvider).
 *
 * Vorerst geben wir nur eine Dummy-URL zurück, damit Frontend & Tests laufen.
 */
export interface StartAgeVerificationSessionOptions {
  userId: string;
  provider?: AgeVerificationProvider;
  redirectUrl?: string; // optionaler Return-URL deines Frontends
}

export interface StartAgeVerificationSessionResult {
  provider: AgeVerificationProvider;
  redirectUrl: string;
  sessionId?: string;
}

export async function startAgeVerificationSession(
  opts: StartAgeVerificationSessionOptions
): Promise<StartAgeVerificationSessionResult> {
  const provider: AgeVerificationProvider = opts.provider ?? "KJM_PROVIDER";

  // Später: echte Session beim Provider anlegen, redirectUrl & sessionId zurückgeben.
  // Aktuell: Dummy-Flow, damit dein Frontend schon die API verwenden kann.
  const base =
    (process.env.FRONTEND_HOST || process.env.APP_BASEURL || "").replace(
      /\/$/,
      ""
    ) || "https://growgram-app.com";

  const redirectUrl =
    opts.redirectUrl ||
    `${base}/age-verify/pending?provider=${encodeURIComponent(provider)}`;

  return {
    provider,
    redirectUrl,
    sessionId: undefined,
  };
}