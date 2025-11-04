import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Users } from '../../validators/index.js';
import * as profile from '../../controllers/auth/profileController.js';

const r = Router();

/** GET /users/me (private) */
r.get('/me', authRequired, profile.me);

/** PATCH /users/me (private) */
r.patch('/me', authRequired, validate.body(Users.UserPatchBody), profile.updateMe);

/** GET /users/:userId (public) */
r.get('/:userId', validate.params(Users.UserIdParam), profile.getPublicProfile);

export default r;