// src/controllers/auth/ageVerificationStartController.ts
//
// Startet eine Altersverifikations-Session bei einem externen Provider.
// Route: POST /api/auth/age/start
//
// Erwartet: Auth (JWT) → authRequired-Middleware setzt req.user/req.auth.

import type { Request, Response } from "express";
import {
  startAgeVerificationSession,
  type AgeVerificationProvider,
} from "../../services/auth/ageVerification.service.js";

type AuthedReq = Request & {
  user?: { uid?: string; id?: string } | null;
  auth?: { uid?: string } | null;
};

function extractUserId(req: AuthedReq): string | null {
  return (
    req.user?.uid ||
    req.user?.id ||
    req.auth?.uid ||
    (req.headers["x-user-id"] as string | undefined) ||
    null
  );
}

export async function startAgeVerification(req: AuthedReq, res: Response) {
  try {
    const uid = extractUserId(req);
    if (!uid) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // Optional: Provider + redirectUrl aus Body/Query
    const body = (req.body ?? {}) as {
      provider?: AgeVerificationProvider;
      redirectUrl?: string;
    };

    const provider = body.provider ?? "KJM_PROVIDER";
    const redirectUrl =
      typeof body.redirectUrl === "string" ? body.redirectUrl : undefined;

    const session = await startAgeVerificationSession({
      userId: uid,
      provider,
      redirectUrl,
    });

    return res.status(200).json({
      ok: true,
      userId: uid,
      provider: session.provider,
      redirectUrl: session.redirectUrl,
      sessionId: session.sessionId ?? null,
    });
  } catch (err) {
    console.error("[startAgeVerification] failed:", err);
    return res.status(500).json({ error: "internal" });
  }
}