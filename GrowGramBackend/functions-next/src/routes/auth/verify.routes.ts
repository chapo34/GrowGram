import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { Auth } from '../../validators/index.js';
import * as ctrl from '../../controllers/auth/verifyController.js';

/** GET /auth/verify-email?token&userId (public) */
const r = Router();
r.get('/verify-email', validate.query(Auth.VerifyEmailQuery), ctrl.verifyEmail);
export default r;