// src/routes/auth/verify.routes.ts
import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { Auth } from "../../validators/index.js";
import * as ctrl from "../../controllers/auth/verifyController.js";

const r = Router();

/** GET /auth/verify-email?token=... (public) */
r.get("/verify-email", validate.query(Auth.VerifyEmailQuery), ctrl.verifyEmail);

export default r;