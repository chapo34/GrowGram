import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { Feed } from '../../validators/index.js';
import * as ctrl from '../../controllers/feed/searchController.js';

const r = Router();

/** GET /search/posts?q=... */
r.get('/posts', validate.query(Feed.SearchQuery), ctrl.searchPosts);

export default r;