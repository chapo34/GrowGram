import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { Feed } from '../../validators/index.js';
import * as ctrl from '../../controllers/feed/feed.controller.js';

const r = Router();
r.get('/trending', validate.query(Feed.PaginationQuery.merge(Feed.TagQuery)), ctrl.trending);
export default r;