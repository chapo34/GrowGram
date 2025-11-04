import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import * as ctrl from '../../controllers/posts/postsController.js';

/**
 * Optionaler JSON-Create (falls du zusätzlich zu Binary-Upload JSON-Create willst).
 * Body: { text, tags[], mediaUrls[], visibility }
 */
const r = Router();
r.post('/create', authRequired, ctrl.createJsonPost);
export default r;