import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Posts } from '../../validators/index.js';
import * as ctrl from '../../controllers/posts/postsController.js';

const r = Router();

/** PATCH /posts/:postId — moderne Variante */
r.patch('/:postId', authRequired, validate.params(Posts.PostIdParam), validate.body(Posts.PostPatchBody), ctrl.patchPost);

/** POST /posts/:postId/visibility — Legacy-Alias */
r.post('/:postId/visibility', authRequired, validate.params(Posts.PostIdParam), validate.body(Posts.PostPatchBody), ctrl.setVisibility);

export default r;