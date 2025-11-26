// src/controllers/auth/verifyController.ts
import type { Request, Response } from "express";
import { admin, db, FieldValue } from "../../config/firebase.js";
import { verifyAccessToken } from "../../services/auth/jwt.service.js";
import type { VerifyEmailQueryT } from "../../validators/auth.schema.js";

function successRedirect(): string {
  const base = (process.env.FRONTEND_HOST || process.env.APP_BASEURL || "").replace(
    /\/$/,
    "",
  );
  return base ? `${base}/verified` : "/verified";
}

function errorRedirect(reason = "invalid"): string {
  const base = (process.env.FRONTEND_HOST || process.env.APP_BASEURL || "").replace(
    /\/$/,
    "",
  );
  const qs = `reason=${encodeURIComponent(reason)}`;
  return base ? `${base}/verify-error?${qs}` : `/verify-error?${qs}`;
}

/**
 * GET /auth/verify-email?token=...
 * Wird per Hosting-Rewrite aufgerufen.
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = (req.query ?? {}) as VerifyEmailQueryT;

    if (!token) {
      return res.redirect(errorRedirect("missing_token"));
    }

    let payload: any;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.redirect(errorRedirect("invalid_token"));
    }

    if (payload?.purpose !== "verify") {
      return res.redirect(errorRedirect("wrong_purpose"));
    }

    const uid = String(payload.userId || payload.sub || "");
    if (!uid) {
      return res.redirect(errorRedirect("missing_uid"));
    }

    // Auth & Firestore markieren
    await admin.auth().updateUser(uid, { emailVerified: true }).catch(() => {});

    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          isVerified: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return res.redirect(successRedirect());
  } catch (e) {
    console.error("[verifyEmail] failed:", e);
    return res.redirect(errorRedirect("internal"));
  }
}