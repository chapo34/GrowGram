// src/routes/posts/create.routes.ts
import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { requireAdultTier } from '../../middleware/auth/ageTier.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Posts } from '../../validators/index.js';
import * as ctrl from '../../controllers/posts/createPostController.js';

const r = Router();

/**
 * Debug-Route, um zu checken, ob dieser Router überhaupt gemountet ist.
 * GET /api/posts/_debug-create
 */
r.get('/_debug-create', (_req, res) => {
  res.status(200).json({ ok: true, scope: 'posts/create.routes.ts' });
});

/**
 * POST /api/posts
 * - benötigt Login
 * - benötigt Adult-Tier (T18 + Compliance + E-Mail-Verifizierung)
 * - Body wird mit Posts.CreateBody validiert
 */
r.post(
  '/',
  authRequired,
  requireAdultTier,
  validate.body(Posts.CreateBody),
  ctrl.createPost
);

export default r;