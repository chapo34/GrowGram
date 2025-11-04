import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Posts } from '../../validators/index.js';
import * as c from '../../controllers/posts/commentsController.js';

const r = Router();

/** GET /posts/:postId/comments */
r.get('/:postId/comments', validate.params(Posts.PostIdParam), c.listByPost);

/** POST /posts/:postId/comments (private) */
r.post('/:postId/comments',
  authRequired,
  validate.params(Posts.PostIdParam),
  validate.body(Posts.CommentCreateBody),
  c.createForPost
);

/** POST /posts/:postId/comments/:commentId/like */
r.post('/:postId/comments/:commentId/like',
  authRequired,
  validate.params(Posts.PostIdParam.merge(Posts.CommentIdParam)),
  c.likeComment
);

/** POST /posts/:postId/comments/:commentId/unlike */
r.post('/:postId/comments/:commentId/unlike',
  authRequired,
  validate.params(Posts.PostIdParam.merge(Posts.CommentIdParam)),
  c.unlikeComment
);

export default r;