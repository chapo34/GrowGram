// functions/src/routes/authRoutes.ts
import { Router } from 'express';
import { body } from 'express-validator';

import { registerValidator, loginValidator } from '../utils/validators.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { registerUser, loginUser } from '../controllers/authController.js';
import { verifyEmailController } from '../controllers/verifyController.js';
import {
  requestPasswordReset,
  resetPasswordConfirm,
} from '../controllers/passwordController.js';

// ⬇️ neu:
import authMiddleware from '../middleware/authMiddleware.js';
import { complianceAck } from '../controllers/complianceController.js';

const router = Router();

/* ---------------- Register & Login ---------------- */
router.post('/register', registerValidator, validateRequest, registerUser);
router.post('/login',    loginValidator,    validateRequest, loginUser);

/* ---------------- Verify ---------------- */
router.get('/verify-email', verifyEmailController);

/* ---------------- Compliance-Ack (neu) ---------------- */
// einfache Validierung: beide Flags müssen true sein; version optional
const complianceAckValidator = [
  body('agree')
    .isBoolean().withMessage('agree muss boolean sein')
    .custom((v) => v === true).withMessage('agree muss true sein'),
  body('over18')
    .isBoolean().withMessage('over18 muss boolean sein')
    .custom((v) => v === true).withMessage('over18 muss true sein'),
  body('version').optional().isString().isLength({ max: 32 }),
];

router.post(
  '/compliance-ack',
  authMiddleware,
  complianceAckValidator,
  validateRequest,
  complianceAck
);

/* ---------------- Password Reset ---------------- */
router.post('/reset-password',         requestPasswordReset);
router.post('/reset-password/confirm', resetPasswordConfirm);

export default router;