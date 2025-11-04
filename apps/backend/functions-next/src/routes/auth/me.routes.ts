import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Users } from '../../validators/index.js';
import * as profile from '../../controllers/auth/profileController.js';
import * as avatar from '../../controllers/avatar/avatarController.js';

/**
 * Aliasse für alte Mobile-Clients, die /auth/me und /auth/me/avatar-binary nutzen.
 * Spiegeln die /users/me Endpunkte.
 */
const r = Router();

r.get('/me', authRequired, profile.me);
r.patch('/me', authRequired, validate.body(Users.UserPatchBody), profile.updateMe);

/** Binary-Avatar (Content-Type: image/jpeg) – Controller puffert Body selbst */
r.post('/me/avatar-binary', authRequired, validate.query(Users.AvatarBinaryQuery), avatar.uploadAvatarBinary);

export default r;