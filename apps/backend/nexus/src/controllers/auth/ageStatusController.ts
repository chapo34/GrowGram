// src/controllers/auth/ageStatusController.ts
//
// Liefert kompakten Age-Status fürs Frontend:
// GET /api/auth/age/status

import type { Request, Response } from "express";
import { db } from "../../config/firebase.js";
import {
  getUserAgeTier,
  type AgeTierResult,
} from "../../services/auth/ageTier.service.js";
import {
  canAccessAdult18PlusAreas,
  type AgeTier,
} from "../../utils/ageGate.js";

type AuthedReq = Request & {
  user?: { uid?: string; id?: string } | null;
  auth?: { uid?: string } | null;
  ageTierMeta?: AgeTierResult;
  ageTier?: AgeTier;
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

/**
 * GET /api/auth/age/status
 */
export async function getAgeStatus(req: AuthedReq, res: Response) {
  try {
    const uid = extractUserId(req);
    if (!uid) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const data = snap.data() as any;

    let meta: AgeTierResult | null = req.ageTierMeta ?? null;
    if (!meta) {
      meta = await getUserAgeTier(uid);
    }

    const tier = meta.tier;
    const canAdult = canAccessAdult18PlusAreas(tier);

    const storedTier =
      (data.ageTier as "16plus" | "18plus" | undefined) ?? null;

    const compliance = data.compliance ?? null;
    const ageVerification = data.ageVerification ?? null;

    const isUnder16 = tier === "U16";
    const is16plus =
      tier === "AGE16" ||
      tier === "AGE18_UNVERIFIED" ||
      tier === "AGE18_VERIFIED";
    const is18plusUnverified = tier === "AGE18_UNVERIFIED";
    const is18plusVerified = tier === "AGE18_VERIFIED";

    return res.status(200).json({
      ok: true,
      userId: userRef.id,
      tier: {
        tier,
        storedTier,
        canAccessAdult18PlusAreas: canAdult,
        isUnder16,
        is16plus,
        is18plusUnverified,
        is18plusVerified,
      },
      compliance,
      ageVerification,
    });
  } catch (err) {
    console.error("[getAgeStatus] failed:", err);
    return res.status(500).json({ error: "internal" });
  }
}