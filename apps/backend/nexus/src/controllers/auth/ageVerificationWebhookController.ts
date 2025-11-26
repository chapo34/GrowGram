// src/controllers/auth/ageVerificationWebhookController.ts
//
// Webhook-Endpoint für externe Altersverifikations-Provider.
// Route-Beispiel: POST /api/auth/age/provider-webhook
//
// Der genaue Body hängt vom Provider ab – wir normalisieren hier auf:
//  {
//    userId: "...",
//    status: "verified" | "failed" | "pending",
//    provider?: "KJM_PROVIDER" | "...",
//    method?: "id_check" | "...",
//    reference?: "tx-123"
//  }

import type { Request, Response } from "express";
import { completeAgeVerificationFromProvider } from "../../services/auth/ageVerification.service.js";

export async function handleAgeVerificationWebhook(
  req: Request,
  res: Response
) {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const userId =
      (typeof body.userId === "string" && body.userId) ||
      (typeof body.uid === "string" && body.uid) ||
      "";

    const rawStatus =
      (typeof body.status === "string" && body.status.toLowerCase()) || "";
    const provider =
      (typeof body.provider === "string" && body.provider) || "KJM_PROVIDER";
    const method =
      (typeof body.method === "string" && body.method) ||
      (typeof body.flow === "string" && body.flow) ||
      "provider_webhook";

    const reference =
      (typeof body.reference === "string" && body.reference) ||
      (typeof body.transactionId === "string" && body.transactionId) ||
      undefined;

    if (!userId || !rawStatus) {
      return res.status(400).json({ error: "bad_request" });
    }

    const status =
      rawStatus === "verified" || rawStatus === "approved"
        ? "verified"
        : rawStatus === "pending"
        ? "pending"
        : "failed";

    const result = await completeAgeVerificationFromProvider({
      userId,
      provider,
      method,
      reference,
      status,
      rawPayload: body,
    });

    return res.status(200).json({
      ok: true,
      userId,
      status: result.status,
    });
  } catch (err) {
    console.error("[handleAgeVerificationWebhook] failed:", err);
    return res.status(500).json({ error: "internal" });
  }
}