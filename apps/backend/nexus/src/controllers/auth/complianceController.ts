// src/controllers/auth/complianceController.ts
import type { Request, Response } from "express";
import { db, auth, FieldValue } from "../../config/firebase.js";
import {
  acceptCompliance,
  type ComplianceAckPayload,
} from "../../services/auth/compliance.service.js";
import type { ComplianceAckBodyT } from "../../validators/auth.schema.js";

type AuthedReq = Request & {
  user?: { uid?: string; id?: string } | null;
  auth?: { uid?: string } | null;
};

/**
 * POST /api/auth/compliance-ack
 *
 * Body (Zod-validiert):
 *  {
 *    agree: true,
 *    over16: true,
 *    over18?: boolean,
 *    version?: string,
 *    device?: string,
 *    at?: string // optional ISO-Zeitpunkt
 *  }
 */
export async function complianceAck(req: AuthedReq, res: Response) {
  try {
    const uid =
      req.user?.uid ||
      req.user?.id ||
      req.auth?.uid ||
      (req.headers["x-user-id"] as string | undefined);

    if (!uid) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const body = (req.body ?? {}) as ComplianceAckBodyT & {
      device?: string;
      at?: string;
    };

    const device =
      body.device ||
      (req.headers["x-device"] as string | undefined) ||
      "unknown";

    const ack: ComplianceAckPayload = {
      agree: body.agree,
      over16: body.over16,
      over18: body.over18 ?? false,
      version: body.version,
      device,
    };

    const result = await acceptCompliance(uid, ack);

    const acknowledgedAt = body.at ? Date.parse(body.at) : Date.now();

    await db
      .collection("users")
      .doc(uid)
      .collection("audit")
      .add({
        type: "compliance_ack",
        device,
        targetAgeTier: result.ageTier,
        acknowledgedAt,
        ts: FieldValue.serverTimestamp(),
      });

    let email: string | undefined;
    try {
      const u = await auth.getUser(uid);
      email = u.email || undefined;
    } catch {
      // noop
    }

    return res.status(200).json({
      ok: true,
      userId: result.userId,
      ageTier: result.ageTier,
      compliance: result.compliance,
      email,
    });
  } catch (err) {
    console.error("[complianceAck] failed:", err);
    return res.status(500).json({ error: "internal" });
  }
}