// src/core/backend/chatApi.ts
import { api } from '@core/http/httpClient';
import type { Chat, ChatMessage } from './types';

export type ApiChatMessage = ChatMessage;

export async function chatList(): Promise<Chat[]> {
  try {
    const { data } = await api.get('/chat/list');
    return (data?.chats ?? []) as Chat[];
  } catch (e: any) {
    try {
      const { data } = await api.get('/chat/threads', { params: { limit: 50 } });
      return (data?.threads ?? []) as Chat[];
    } catch {
      throw e;
    }
  }
}

export async function chatOpen(peerId: string): Promise<Chat> {
  try {
    const { data } = await api.post('/chat/open', { peerId });
    return (data?.chat ?? data?.thread) as Chat;
  } catch {
    const { data } = await api.post('/chat/start', { peerId });
    return (data?.thread ?? data?.chat) as Chat;
  }
}

export async function chatSearchUsers(q: string): Promise<any[]> {
  const params = { q };
  try {
    return ((await api.get('/chat/users/search', { params })).data?.users ??
      []) as any[];
  } catch {
    // ignore
  }
  try {
    return ((await api.get('/users/search', { params })).data?.users ??
      []) as any[];
  } catch {
    // ignore
  }
  try {
    return ((await api.get('/search/users', { params })).data?.users ??
      []) as any[];
  } catch {
    // ignore
  }
  return [];
}

export async function chatGetMessages(
  chatId: string,
  limit = 30,
  cursor?: string | number | null
) {
  const params: any = { limit };
  if (cursor) params.cursor = cursor;
  try {
    const { data } = await api.get(`/chat/${chatId}/messages`, { params });
    return data as { messages: ChatMessage[]; nextCursor: number | null };
  } catch (e: any) {
    const { data } = await api.get(`/chat/threads/${chatId}/messages`, {
      params,
    });
    return data as { messages: ChatMessage[]; nextCursor: number | null };
  }
}

export async function chatSendMessageBasic(
  chatId: string,
  text: string
): Promise<ChatMessage> {
  try {
    const { data } = await api.post(`/chat/${chatId}/messages`, { text });
    return data as ChatMessage;
  } catch {
    const { data } = await api.post(`/chat/threads/${chatId}/send`, { text });
    return (data?.message ?? data) as ChatMessage;
  }
}

export async function chatSendMessage(
  chatId: string,
  text: string,
  extra?: string | { replyToId?: string | null }
) {
  let replyToId: string | undefined;
  if (typeof extra === 'string') replyToId = extra || undefined;
  else if (extra && typeof extra === 'object') replyToId = extra.replyToId ?? undefined;

  const payload: any = { text };
  if (replyToId) payload.replyToId = replyToId;

  try {
    const { data } = await api.post(`/chat/${chatId}/messages`, payload);
    return data?.message || data;
  } catch {
    const { data } = await api.post(`/chat/threads/${chatId}/send`, payload);
    return data?.message || data;
  }
}

export async function chatEditMessage(
  chatId: string,
  messageId: string,
  text: string
) {
  const { data } = await api.post(
    `/chat/${chatId}/messages/${messageId}/edit`,
    { text }
  );
  return data?.message || data;
}

export async function chatUnsendMessage(
  chatId: string,
  messageId: string
) {
  const { data } = await api.post(
    `/chat/${chatId}/messages/${messageId}/unsend`,
    {}
  );
  return data?.ok ?? true;
}

export async function chatMarkRead(chatId: string) {
  try {
    await api.post(`/chat/${chatId}/read`);
  } catch {
    await api.post(`/chat/threads/${chatId}/read`);
  }
}

export async function chatSendMedia(chatId: string, file: { uri: string; name: string; type: string }) {
  const fd = new FormData();
  fd.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  fd.append('chatId', chatId);

  const { data } = await api.post(`/chat/${chatId}/media`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.message || data;
}

export async function groupCreate(name: string, memberIds: string[]) {
  try {
    const { data } = await api.post('/group/create', { name, memberIds });
    const thr = data?.thread || data?.chat;
    if (thr?.id) return thr;
  } catch {
    // ignore
  }
  const { data: r } = await api.post('/chat/startGroup', { name, memberIds });
  const thr = r?.thread || r?.chat;
  if (!thr?.id) throw new Error('Group create failed');
  return thr;
}

export async function chatArchive(chatId: string, to = true): Promise<void> {
  try {
    if (to) await api.post('/chat/archive', { chatId });
    else await api.post('/chat/unarchive', { chatId });
  } catch {
    try {
      if (to) await api.post(`/chat/${chatId}/archive`);
      else await api.post(`/chat/${chatId}/unarchive`);
    } catch (e) {
      throw e;
    }
  }
}

export async function chatMute(chatId: string, mute = true): Promise<void> {
  try {
    await api.post('/chat/mute', { chatId, mute });
  } catch {
    await api.post(`/chat/${chatId}/mute`, { mute });
  }
}

export async function chatDelete(chatId: string): Promise<void> {
  try {
    await api.post('/chat/delete', { chatId });
  } catch {
    try {
      await api.delete(`/chat/${chatId}`);
    } catch {
      await api.delete(`/chat/threads/${chatId}`);
    }
  }
}

export async function groupLeave(chatId: string): Promise<void> {
  try {
    await api.post('/group/leave', { chatId });
  } catch {
    try {
      await api.post(`/chat/${chatId}/leave`, {});
    } catch {
      await api.post(`/chat/threads/${chatId}/leave`, {});
    }
  }
}