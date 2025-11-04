import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { Auth } from '../../validators/index.js';
import * as ctrl from '../../controllers/auth/loginController.js';
import { authRequired } from '../../middleware/auth/auth.middleware.js';

const r = Router();

/** POST /auth/login (public) */
r.post('/login', validate.body(Auth.LoginBody), ctrl.login);

/** POST /auth/logout (optional server-side) */
r.post('/logout', authRequired, ctrl.logout);

export default r;