import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Chat } from '../../validators/index.js';
import * as upload from '../../middleware/upload.middleware.js';
import * as ctrl from '../../controllers/chat/chatController.js';

const r = Router();

/** POST /chat/:chatId/media (multipart/form-data; field: "file") */
r.post('/:chatId/media',
  authRequired,
  validate.params(Chat.ChatIdParam),
  upload.single('file'),
  ctrl.sendMedia
);

export default r;