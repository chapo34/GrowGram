// src/routes/posts/index.ts
//
// Zentraler Posts-Router.
// WICHTIG: Hier definieren wir direkt
//   POST /posts        +   POST /api/posts
//   (über app.use('/posts', ...) + app.use('/api/posts', ...))
//
// Kette für Create:
//   authRequired → requireAdultTier → validate.body(Posts.CreateBody) → createPost

import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { requireAdultTier } from '../../middleware/auth/ageTier.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Posts } from '../../validators/index.js';
import * as createCtrl from '../../controllers/posts/createPostController.js';

// Bestehende Subrouter
import uploadBinary from './upload-binary.routes.js';
import visibility from './visibility.routes.js';
import likes from './likes.routes.js';
import comments from './comments.routes.js';

const r = Router();

/**
 * POST /posts      (im Plain-Modus)
 * POST /api/posts  (im API-Modus)
 *
 * → Nur 18+ VERIFIZIERTE User (AGE18_VERIFIED) dürfen posten.
 * → Body wird über Zod (Posts.CreateBody) geprüft.
 */
r.post(
  '/',
  authRequired,
  requireAdultTier,
  validate.body(Posts.CreateBody),
  createCtrl.createPost
);

// Andere Post-Routen dranhängen
r.use(uploadBinary);
r.use(visibility);
r.use(likes);
r.use(comments);

export default r;