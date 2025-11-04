import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { Auth } from '../../validators/index.js';
import * as ctrl from '../../controllers/auth/registerController.js';

const r = Router();

/** POST /auth/register (public) */
r.post('/register', validate.body(Auth.RegisterBody), ctrl.register);

export default r;