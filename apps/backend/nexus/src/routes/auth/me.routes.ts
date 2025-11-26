// src/routes/auth/me.routes.ts

import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { attachAgeTier } from '../../middleware/auth/ageTier.middleware.js';
import * as ctrl from '../../controllers/auth/meController.js';

const r = Router();

/**
 * GET /api/auth/me
 *
 * Headers:
 *  - Authorization: Bearer <accessToken>
 *
 * Response:
 *  {
 *    ok: true,
 *    user: { ...Profil... },
 *    ageTier: {
 *      tier: "UNKNOWN" | "U16" | "AGE16" | "AGE18_UNVERIFIED" | "AGE18_VERIFIED",
 *      canAccessAdult18PlusAreas: boolean,
 *      source: { birthDate, isVerified, compliance, ageVerifiedAt }
 *    },
 *    compliance: { ... },
 *    ageVerification: { ... }
 *  }
 */
r.get('/me', authRequired, attachAgeTier, ctrl.getMe);

export default r;