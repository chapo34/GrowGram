import * as Chats from '../../repositories/chats.repo.js';

export const listThreads = (userId: string, limit = 20, cursor?: string) =>
  Chats.listChatThreads(userId, { limit, cursor });

export const openDM = (userId: string, peerId: string) =>
  Chats.openDirectMessage(userId, peerId);

export const archive = (chatId: string, userId: string, to: boolean) =>
  Chats.setArchived(chatId, userId, to);

export const mute = (chatId: string, userId: string, mute: boolean) =>
  Chats.setMuted(chatId, userId, mute);

export const leave = (chatId: string, userId: string) =>
  Chats.leaveThread(chatId, userId);

export const remove = (chatId: string, userId: string) =>
  Chats.deleteThread(chatId, userId);

export const createGroup = (ownerId: string, name: string, memberIds: string[]) =>
  Chats.createGroup(name, memberIds);