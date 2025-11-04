import { Router } from 'express';
import { authRequired, requireRoles } from '../../middleware/auth/roles.middleware.js';
import * as ctrl from '../../controllers/admin/seedController.js';

/** Admin-only Seeds */
const r = Router();
r.post('/seed', authRequired, requireRoles('admin'), ctrl.seed);
r.post('/dev-seed', authRequired, requireRoles('admin'), ctrl.devSeed);

export default r;