// src/controllers/auth/ageVerificationController.ts
//
// Interner/Admin-Endpoint, um einen Nutzer als 18+ VERIFIZIERT zu markieren.
// Der Token-Check läuft in middleware/auth/adminTaskToken.ts.

import type { Request, Response } from "express";
import { markUserAgeVerified } from "../../services/auth/ageVerification.service.js";

export async function adminMarkAgeVerified(req: Request, res: Response) {
  try {
    const { userId, provider, method, reference } = req.body as {
      userId?: string;
      provider?: string;
      method?: string;
      reference?: string;
    };

    if (!userId || !provider || !method) {
      return res.status(422).json({ error: "validation_error" });
    }

    await markUserAgeVerified({
      userId,
      provider,
      method,
      reference,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[adminMarkAgeVerified] failed:", err);
    return res.status(500).json({ error: "internal" });
  }
}