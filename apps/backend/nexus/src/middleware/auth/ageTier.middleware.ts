// src/middleware/auth/ageTier.middleware.ts

import type { Request, Response, NextFunction } from "express";
import {
  getUserAgeTier,
  assertAdultVerified,
  type AgeTierResult,
} from "../../services/auth/ageTier.service.js";   // <-- zwei Punkte hoch
import type { AgeTier } from "../../utils/ageGate.js"; // <-- auch zwei Punkte hoch

declare module "express-serve-static-core" {
  interface Request {
    ageTierMeta?: AgeTierResult;
    ageTier?: AgeTier;
  }
}

function extractUserId(req: Request): string | null {
  const anyReq = req as any;

  const fromUser = anyReq.user?.uid || anyReq.user?.id || null;
  const fromAuth = anyReq.auth?.uid || null;
  const fromHeader = (req.headers["x-user-id"] as string | undefined) || null;

  return fromUser || fromAuth || fromHeader;
}

export async function attachAgeTier(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const userId = extractUserId(req);
    if (!userId) return next();

    const meta = await getUserAgeTier(userId);
    (req as any).ageTierMeta = meta;
    (req as any).ageTier = meta.tier;
    return next();
  } catch (err) {
    console.error("[attachAgeTier] failed:", err);
    return next();
  }
}

export async function requireAdultTier(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const meta = await assertAdultVerified(userId);
    (req as any).ageTierMeta = meta;
    (req as any).ageTier = meta.tier;

    return next();
  } catch (err: any) {
    if (err && err.code === "adult_verification_required") {
      return res.status(403).json({ error: "adult_verification_required" });
    }

    console.error("[requireAdultTier] unexpected error:", err);
    return res.status(500).json({ error: "internal" });
  }
}