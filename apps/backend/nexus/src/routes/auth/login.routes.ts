// src/routes/auth/login.routes.ts
import { Router } from "express";
import { login, logout } from "../../controllers/auth/loginController.js";
import { validate } from "../../middleware/validate.middleware.js";
import { makeTightLimiter } from "../../config/rateLimit.js";
import { Auth } from "../../validators/index.js";

const r = Router();
const tight = makeTightLimiter();

/**
 * POST /auth/login
 * Body: Auth.LoginBody (Zod)
 */
r.post(
  "/login",
  tight,
  validate.body(Auth.LoginBody),
  login,
);

/**
 * POST /auth/logout
 * - JWT optional im Authorization-Header
 */
r.post("/logout", tight, logout);

export default r;