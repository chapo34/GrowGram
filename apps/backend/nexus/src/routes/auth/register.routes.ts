// src/routes/auth/register.routes.ts
import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { Auth } from "../../validators/index.js";
import * as ctrl from "../../controllers/auth/registerController.js";

const r = Router();

/**
 * POST /auth/register (public)
 * Erwartet Body gemäß Auth.RegisterBody (STEP 1 – Basisdaten)
 */
r.post("/register", validate.body(Auth.RegisterBody), ctrl.register);

export default r;