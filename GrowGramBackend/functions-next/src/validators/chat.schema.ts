import { z } from 'zod';

const zTrim = () => z.string().trim();

export const ChatIdParam = z.object({
  chatId: zTrim().min(8),
});

export const MessageIdParam = z.object({
  messageId: zTrim().min(8),
});

/** POST /chat/open */
export const ChatOpenBody = z.object({
  peerId: zTrim().min(6),
});

/** POST /chat/:chatId/messages */
export const ChatSendMessageBody = z.object({
  text     : zTrim().max(2000).optional(),
  replyToId: zTrim().optional(),
  mediaUrls: z.array(zTrim().url()).max(10).optional(),
}).refine(d => d.text || (d.mediaUrls && d.mediaUrls.length > 0), {
  message: 'either text or mediaUrls required',
});

export type TChatIdParam           = z.infer<typeof ChatIdParam>;
export type TMessageIdParam        = z.infer<typeof MessageIdParam>;
export type TChatOpenBody          = z.infer<typeof ChatOpenBody>;
export type TChatSendMessageBody   = z.infer<typeof ChatSendMessageBody>;