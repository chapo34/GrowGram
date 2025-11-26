// src/routes/feed/trending.routes.ts
import { Router } from 'express';
import { attachAgeTier } from '../../middleware/auth/ageTier.middleware.js';
import * as ctrl from '../../controllers/feed/trendingController.js';

const r = Router();

/**
 * GET /api/feed/trending
 *
 * Optional Query:
 *  - ?limit=20
 *  - ?cursor=<postId>
 *  - ?tag=grow
 *
 * AgeGate:
 *  - attachAgeTier liest User-Doc und hängt req.ageTier an
 *  - trendingFeed filtert Posts serverseitig nach AgeTier
 *
 * Wichtig: KEIN authRequired → Gäste dürfen auch gucken,
 *          fallen dann auf AgeTier "UNKNOWN" zurück.
 */
r.get('/trending', attachAgeTier, ctrl.trendingFeed);

export default r;