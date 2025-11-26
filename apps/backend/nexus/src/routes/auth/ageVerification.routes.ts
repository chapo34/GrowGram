// src/routes/auth/ageVerification.routes.ts
//
// Age-Verification-Routen:
//
//  - POST /auth/age/mark-verified
//      → Admin-/CLI-Only (x-admin-task-token)
//  - POST /auth/age/start
//      → eingeloggter User startet Verifizierung bei externem Provider
//  - POST /auth/age/provider-webhook
//      → Callback vom externen Verifizierungsdienst (KJM/ID-Check)

import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { Auth } from "../../validators/index.js";
import { adminMarkAgeVerified } from "../../controllers/auth/ageVerificationController.js";
import { requireAdminTaskToken } from "../../middleware/auth/adminTaskToken.js";
import { authRequired } from "../../middleware/auth/auth.middleware.js";
import { startAgeVerification } from "../../controllers/auth/ageVerificationStartController.js";
import { handleAgeVerificationWebhook } from "../../controllers/auth/ageVerificationWebhookController.js";

const r = Router();

/**
 * Admin-Endpoint (intern, z.B. CLI / Postman mit x-admin-task-token).
 * Ergebnis-URL: POST /api/auth/age/mark-verified
 */
r.post(
  "/age/mark-verified",
  requireAdminTaskToken,
  validate.body(Auth.MarkAgeVerifiedBody),
  adminMarkAgeVerified
);

/**
 * User-Endpoint: Verifikationsflow starten.
 * Ergebnis-URL: POST /api/auth/age/start
 */
r.post("/age/start", authRequired, startAgeVerification);

/**
 * Provider-Webhook:
 * Ergebnis-URL: POST /api/auth/age/provider-webhook
 *
 * WICHTIG:
 *  - Später: Signaturprüfung (Header, HMAC, etc.) ergänzen.
 *  - Aktuell: bewusst offen, um lokale Tests/Mocking zu erleichtern.
 */
r.post("/age/provider-webhook", handleAgeVerificationWebhook);

export default r;