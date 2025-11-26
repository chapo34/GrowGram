// backend/nexus/src/services/auth/compliance.service.ts
import { db, FieldValue } from "../../config/firebase.js";

export type ComplianceAckPayload = {
  agree: boolean;              // User akzeptiert Bedingungen
  over16: boolean;             // "Ich bin mindestens 16"
  over18?: boolean;            // optional: "Ich bin 18+"
  version?: string;            // AGB/Compliance-Version
  device?: string;             // z.B. "iPhone 15 / iOS", "Web/Chrome"
};

export type ComplianceResult = {
  userId: string;
  ageTier: "16plus" | "18plus";
  compliance: any | null;
};

export async function acceptCompliance(
  userId: string,
  ack: ComplianceAckPayload
): Promise<ComplianceResult> {
  if (!userId) throw new Error("unauthorized");

  // Minimalbedingungen: muss zustimmen & mind. 16 sein
  if (!ack?.agree || !ack?.over16) {
    throw new Error("invalid_compliance");
  }

  const ref = db.collection("users").doc(userId);
  const ts = FieldValue.serverTimestamp();

  // gewünschte Ziel-Stufe: 16+ oder 18+
  const requestedTier: "16plus" | "18plus" = ack.over18 ? "18plus" : "16plus";

  // Vorhandene Daten holen, um kein Downgrade zu machen
  const existingSnap = await ref.get();
  const existing = existingSnap.data() as any | undefined;
  const existingTier = existing?.ageTier as "16plus" | "18plus" | undefined;

  // Falls User schon 18plus ist, nicht auf 16plus zurückstufen
  const finalTier: "16plus" | "18plus" =
    existingTier === "18plus" && requestedTier === "16plus"
      ? "18plus"
      : requestedTier;

  const updateData = {
    compliance: {
      agree: true,
      over16: true,
      over18: !!ack.over18,
      version: ack.version ?? "v1",
      acceptedAt: ts,
      device: ack.device ?? null,
    },
    ageTier: finalTier,
    // ageVerified bleibt erstmal offen – später für KI / Provider
    updatedAt: ts,
  };

  await ref.set(updateData, { merge: true });

  const snap = await ref.get();
  const fresh = snap.data() as any | undefined;

  return {
    userId: ref.id,
    ageTier: (fresh?.ageTier as "16plus" | "18plus") ?? finalTier,
    compliance: fresh?.compliance ?? null,
  };
}