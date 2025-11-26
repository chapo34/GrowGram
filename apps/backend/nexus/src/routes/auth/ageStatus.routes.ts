// src/routes/auth/ageStatus.routes.ts
//
// GET /auth/age/status → /api/auth/age/status

import { Router } from "express";
import { authRequired } from "../../middleware/auth/auth.middleware.js";
import { attachAgeTier } from "../../middleware/auth/ageTier.middleware.js";
import * as ctrl from "../../controllers/auth/ageStatusController.js";

const r = Router();

r.get("/age/status", authRequired, attachAgeTier, ctrl.getAgeStatus);

export default r;