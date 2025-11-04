import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Users } from '../../validators/index.js';
import * as avatar from '../../controllers/avatar/avatarController.js';

const r = Router();

/**
 * POST /users/me/avatar-binary
 * Expo sendet Binary (image/jpeg). Der Controller liest Raw-Body und speichert im Storage.
 * Query: ?filename=avatar.jpg
 */
r.post('/me/avatar-binary', authRequired, validate.query(Users.AvatarBinaryQuery), avatar.uploadAvatarBinary);

export default r;