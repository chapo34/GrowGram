import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Posts } from '../../validators/index.js';
import * as ctrl from '../../controllers/posts/postUploadController.js';

/**
 * POST /posts/upload-binary
 * Binary-Upload (image/jpeg) + Metadaten in Query
 * Controller übernimmt Body-Pufferung/Erkennung des Content-Types.
 */
const r = Router();
r.post('/upload-binary', authRequired, validate.query(Posts.UploadBinaryQuery), ctrl.uploadBinaryCreatePost);
export default r;