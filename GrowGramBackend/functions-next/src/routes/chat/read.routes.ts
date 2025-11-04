import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Chat } from '../../validators/index.js';
import * as ctrl from '../../controllers/chat/chatController.js';

const r = Router();

/** POST /chat/:chatId/read */
r.post('/:chatId/read', authRequired, validate.params(Chat.ChatIdParam), ctrl.markRead);

export default r;