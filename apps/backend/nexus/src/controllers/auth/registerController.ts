// src/controllers/auth/registerController.ts
import type { Request, Response } from "express";
import type { SignOptions } from "jsonwebtoken";

import { db, auth, FieldValue } from "../../config/firebase.js";
import { signAccessToken } from "../../services/auth/jwt.service.js";
import {
  buildVerifyUrlForFrontend,
  buildVerifyUrlFromBackend,
  sendVerificationEmail,
} from "../../services/auth/email.service.js";
import type { RegisterBodyT } from "../../validators/auth.schema.js";

/**
 * POST /api/auth/register
 *
 * Body wird bereits via Zod (RegisterBody) validiert.
 *
 * STEP 1:
 *  - Pflicht: email, password
 *  - Optional: username, firstName, lastName, city, birthDate
 *
 * Diese Funktion kümmert sich um:
 *  - User in Firebase Auth
 *  - Profildokument in Firestore
 *  - Verify-Token + E-Mail
 */
export async function register(req: Request, res: Response) {
  try {
    const body = req.body as RegisterBodyT;

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim() || undefined;
    const city = body.city?.trim() || undefined;
    const birthDate = body.birthDate?.trim() || undefined; // "YYYY-MM-DD"
    const username = body.username?.trim() || undefined;

    // User in Firebase Auth anlegen / holen
    let user: import("firebase-admin/auth").UserRecord;
    try {
      user = await auth.getUserByEmail(email);
    } catch {
      user = await auth.createUser({
        email,
        password,
        displayName: [firstName, lastName].filter(Boolean).join(" "),
        emailVerified: false,
      });
    }

    const uid = user.uid;

    // Profil in Firestore anlegen/mergen
    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          username: username ?? null,
          email,
          city: city ?? null,
          birthDate: birthDate ?? null,
          isVerified: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    // Ablaufdauer des Verify-Tokens
    const verifyExp = (process.env.VERIFY_EXPIRES ?? "24h") as SignOptions["expiresIn"];

    const token = signAccessToken(
      { sub: uid, userId: uid, email, purpose: "verify" },
      { expiresIn: verifyExp },
    );

    // Bevorzugt hübsche Frontend-URL, sonst direkte Backend-URL
    const verifyUrl =
      buildVerifyUrlForFrontend(token) ?? buildVerifyUrlFromBackend(token);

    // E-Mail senden – Fehler brechen Registrierung NICHT ab
    const emailRes = await sendVerificationEmail({
      to: email,
      firstName,
      verificationUrl: verifyUrl,
    });

    if (!emailRes.ok) {
      console.warn("[register] verification email failed:", emailRes.error);
    }

    // Dev/Emu: verifyUrl für Postman mit zurückgeben
    return res.status(201).json({
      ok: true,
      userId: uid,
      verifyUrl,
    });
  } catch (e) {
    console.error("[register] failed:", e);
    return res
      .status(500)
      .json({ error: "internal", details: "register_failed" });
  }
}