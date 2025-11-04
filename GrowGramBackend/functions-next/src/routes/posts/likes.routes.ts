import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Posts } from '../../validators/index.js';
import * as likes from '../../controllers/posts/likesController.js';

const r = Router();

r.post('/:postId/like', authRequired, validate.params(Posts.PostIdParam), likes.like);
r.post('/:postId/unlike', authRequired, validate.params(Posts.PostIdParam), likes.unlike);

export default r;