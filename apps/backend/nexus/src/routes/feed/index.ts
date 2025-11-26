import { Router } from 'express';
import trendingRoutes from './trending.routes.js';
import forYouRoutes from './for-you.routes.js';
import tagsRoutes from './tags.routes.js';
import searchRoutes from './search.routes.js';

const router = Router();

router.use('/trending', trendingRoutes);
router.use('/for-you', forYouRoutes);
router.use('/tags', tagsRoutes);
router.use('/search', searchRoutes);

export default router;