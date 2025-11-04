import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Chat, Feed } from '../../validators/index.js';
import * as ctrl from '../../controllers/chat/chatController.js';

const r = Router();

/** GET /chat/:chatId/messages?limit&cursor */
r.get('/:chatId/messages',
  authRequired,
  validate.params(Chat.ChatIdParam),
  validate.query(Feed.PaginationQuery),
  ctrl.listMessages
);

/** POST /chat/:chatId/messages (text / replyToId / mediaUrls) */
r.post('/:chatId/messages',
  authRequired,
  validate.params(Chat.ChatIdParam),
  validate.body(Chat.ChatSendMessageBody),
  ctrl.sendMessage
);

/** POST /chat/:chatId/messages/:messageId/edit */
r.post('/:chatId/messages/:messageId/edit',
  authRequired,
  validate.params(Chat.ChatIdParam.merge(Chat.MessageIdParam)),
  ctrl.editMessage
);

/** POST /chat/:chatId/messages/:messageId/unsend */
r.post('/:chatId/messages/:messageId/unsend',
  authRequired,
  validate.params(Chat.ChatIdParam.merge(Chat.MessageIdParam)),
  ctrl.unsendMessage
);

export default r;