import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Chat } from '../../validators/index.js';
import * as ctrl from '../../controllers/chat/chatController.js';

const r = Router();

/** POST /chat/open { peerId } → öffnet/erstellt DM */
r.post('/open', authRequired, validate.body(Chat.ChatOpenBody), ctrl.open);

export default r;