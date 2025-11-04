import * as Chats from '../../repositories/chats.repo.js';

export const list = (chatId: string, userId: string, limit = 30, cursor?: string) =>
  Chats.getMessages(chatId, { limit, cursor });

export const send = (chatId: string, userId: string, text: string, replyToId?: string) =>
  Chats.sendMessage(chatId, { senderId: userId, text, replyToId });

export const edit = (chatId: string, userId: string, messageId: string, text: string) =>
  Promise.resolve(); // TODO: echtes Edit (Repo-API vorbereiten)

export const unsend = (chatId: string, userId: string, messageId: string) =>
  Promise.resolve(); // TODO: echtes Unsend

export const markRead = (chatId: string, userId: string) =>
  Chats.markRead(chatId, userId);