import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { Auth } from '../../validators/index.js';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import * as ctrl from '../../controllers/auth/complianceController.js';

/** POST /auth/compliance-ack (private) */
const r = Router();
r.post('/compliance-ack', authRequired, validate.body(Auth.ComplianceAckBody), ctrl.complianceAck);
export default r;