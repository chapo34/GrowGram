import { Router } from 'express';
import * as ctrl from '../../controllers/feed/feed.controller.js';

const r = Router();
r.get('/trending-tags', ctrl.trendingTags);
export default r;