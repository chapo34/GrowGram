// src/controllers/auth/loginController.ts
import type { Request, Response } from "express";
import { loginWithPassword, revokeAllSessions } from "../../services/auth/login.service.js";
import { verifyAccessToken } from "../../services/auth/jwt.service.js";
import type { LoginBodyT } from "../../validators/auth.schema.js";

/**
 * POST /api/auth/login
 * Body wird durch Zod (LoginBody) validiert.
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as LoginBodyT;

    const result = await loginWithPassword(email, password);

    return res.status(200).json({
      ok: true,
      uid: result.uid,
      email: result.email,
      accessToken: result.accessToken,
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  } catch (e: any) {
    if (e?.status === 401) {
      return res
        .status(401)
        .json({
          error: "unauthorized",
          reason: e?.message || "invalid_credentials",
        });
    }

    console.error("[login] failed:", e);
    return res.status(500).json({ error: "internal" });
  }
}

/**
 * POST /api/auth/logout
 *
 * Variante:
 *  - JWT stateless → Client löscht Tokens (standard)
 *  - optional: alle Sessions via Firebase revoken
 */
export async function logout(req: Request, res: Response) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.replace(/^Bearer\s+/i, "").trim();

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        const uid = (payload.userId || payload.sub) as string | undefined;
        if (uid) {
          await revokeAllSessions(uid);
        }
      } catch {
        // Token ungültig → trotzdem 204 zurück
      }
    }

    return res.status(204).end();
  } catch (e) {
    console.error("[logout] failed:", e);
    return res.status(500).json({ error: "internal" });
  }
}