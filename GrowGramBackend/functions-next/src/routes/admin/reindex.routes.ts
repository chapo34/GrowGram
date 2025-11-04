import { Router } from 'express';
import { authRequired, requireRoles } from '../../middleware/auth/roles.middleware.js';
import * as ctrl from '../../controllers/admin/devSeedController.js';

/** Admin-only Reindex (oder in eigenem Controller, z.B. reindexController) */
const r = Router();
r.post('/reindex', authRequired, requireRoles('admin'), ctrl.reindex);

export default r;