// src/routes/auth/compliance.routes.ts
import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { Auth } from "../../validators/index.js";
import { authRequired } from "../../middleware/auth/auth.middleware.js";
import * as ctrl from "../../controllers/auth/complianceController.js";

const r = Router();

/**
 * POST /auth/compliance-ack
 * → real URL: POST /api/auth/compliance-ack
 */
r.post(
  "/compliance-ack",
  authRequired,
  validate.body(Auth.ComplianceAckBody),
  ctrl.complianceAck,
);

export default r;