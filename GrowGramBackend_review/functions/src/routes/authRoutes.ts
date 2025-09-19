// src/routes/authRoutes.ts
import { Router } from 'express';
import { registerUser, loginUser, me } from '../controllers/authController.js';
import { verifyEmail } from '../controllers/verifyController.js';
import { requestPasswordReset, showResetForm, resetPassword } from '../controllers/passwordController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { auth } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';

const router = Router();

router.post(
  '/register',
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('city').notEmpty(),
    body('birthDate').notEmpty(),
    body('username').optional().isString().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9._]+$/),
  ],
  validateRequest,
  registerUser
);

router.post(
  '/login',
  [
    body('identifier').isString().trim().isLength({ min: 3 }),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  loginUser
);

// Verifizierung
router.get('/verify-email', verifyEmail);
router.get('/verify-email/:token', verifyEmail);

// Password Reset
router.post('/request-password-reset', [body('email').isEmail()], validateRequest, requestPasswordReset);
router.get('/reset-password', showResetForm);
router.post('/reset-password', [body('token').isString().notEmpty(), body('newPassword').isLength({ min: 6 })], validateRequest, resetPassword);

// ✅ geschützter Endpunkt
router.get('/me', auth, me);

export default router;