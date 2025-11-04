import { db, FieldValue, nowISO } from '../config/firebase.js';

export type Chat = {
  id: string;
  type: 'dm' | 'group';
  name: string | null;
  memberIds: string[];
  lastMessage: { text: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  type: 'text';
  text: string;
  mediaUrls: string[];
  readBy: string[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

const CHATS = db.collection('chats');

const S = (v: any, fb = '') => (typeof v === 'string' ? v : fb);
const A = <T>(v: any, map: (x: any) => T, fb: T[] = []) => (Array.isArray(v) ? v.map(map) : fb);

function mapChat(doc: FirebaseFirestore.DocumentSnapshot): Chat {
  const d: any = doc.data() || {};
  return {
    id: doc.id,
    type: d.type === 'group' ? 'group' : 'dm',
    name: d.name ?? null,
    memberIds: A(d.memberIds, String),
    lastMessage: d.lastMessage
      ? { text: S(d.lastMessage.text), senderId: S(d.lastMessage.senderId), createdAt: S(d.lastMessage.createdAt, nowISO()) }
      : null,
    lastMessageAt: d.lastMessageAt ?? null,
    createdAt: d.createdAt ?? nowISO(),
    updatedAt: d.updatedAt ?? nowISO(),
  };
}

function mapMessage(chatId: string, doc: FirebaseFirestore.DocumentSnapshot): ChatMessage {
  const x: any = doc.data() || {};
  return {
    id: doc.id,
    chatId,
    senderId: S(x.senderId),
    type: 'text',
    text: S(x.text),
    mediaUrls: A(x.mediaUrls, String),
    readBy: A(x.readBy, String),
    createdAt: x.createdAt ?? nowISO(),
    editedAt: x.editedAt ?? null,
    deletedAt: x.deletedAt ?? null,
  };
}

export async function listByUser(
  userId: string,
  { limit = 20, cursor }: { limit?: number; cursor?: string } = {},
) {
  let q = CHATS.where('memberIds', 'array-contains', String(userId))
    .orderBy('updatedAt', 'desc')
    .limit(limit);
  if (cursor) {
    const cur = await CHATS.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const snap = await q.get();
  return { chats: snap.docs.map(mapChat), nextCursor: snap.size === limit ? snap.docs.at(-1)!.id : null };
}

export async function upsertDM(a: string, b: string) {
  const memberIds = [String(a), String(b)].sort();
  const key = memberIds.join('__');
  const hit = await CHATS.where('type', '==', 'dm').where('key', '==', key).limit(1).get();
  if (!hit.empty) return { chat: mapChat(hit.docs[0]), created: false };

  const payload = {
    type: 'dm' as const,
    key,
    name: null,
    memberIds,
    lastMessage: null,
    lastMessageAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const ref = await CHATS.add(payload);
  return { chat: { id: ref.id, ...payload }, created: true };
}

export async function createGroup(name: string, memberIds: string[]) {
  const payload = {
    type: 'group' as const,
    name: S(name),
    memberIds: memberIds.map(String),
    lastMessage: null,
    lastMessageAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const ref = await CHATS.add(payload);
  return { id: ref.id, ...payload };
}

export async function listMessages(
  chatId: string, { limit = 30, cursor }: { limit?: number; cursor?: string } = {},
) {
  const col = CHATS.doc(chatId).collection('messages');
  let q = col.orderBy('createdAt', 'desc').limit(limit);
  if (cursor) {
    const cur = await col.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const snap = await q.get();
  return { messages: snap.docs.map((d) => mapMessage(chatId, d)), nextCursor: snap.size === limit ? snap.docs.at(-1)!.id : null };
}

export async function appendMessage(
  chatId: string,
  message: { senderId: string; text: string; mediaUrls?: string[]; replyToId?: string },
): Promise<ChatMessage> {
  const payload = {
    chatId, senderId: S(message.senderId), type: 'text' as const,
    text: S(message.text), mediaUrls: A(message.mediaUrls, String), readBy: [],
    createdAt: nowISO(), editedAt: null as string | null, deletedAt: null as string | null,
  };
  const col = CHATS.doc(chatId).collection('messages');
  const ref = await col.add(payload);
  await CHATS.doc(chatId).set(
    { lastMessage: { text: payload.text, senderId: payload.senderId, createdAt: payload.createdAt }, lastMessageAt: payload.createdAt, updatedAt: nowISO() },
    { merge: true },
  );
  return { id: ref.id, ...payload };
}

async function markReadMessageId(chatId: string, messageId: string, userId: string): Promise<void> {
  const msgRef = CHATS.doc(chatId).collection('messages').doc(messageId);
  await msgRef.set({ readBy: FieldValue.arrayUnion(String(userId)) }, { merge: true });
}

export async function markRead(chatId: string, userId: string): Promise<void> {
  const col = CHATS.doc(chatId).collection('messages');
  const snap = await col.orderBy('createdAt', 'desc').limit(1).get();
  if (snap.empty) return;
  await markReadMessageId(chatId, snap.docs[0].id, userId);
}

/** Aliase für Services */
export const listChatThreads = (userId: string, p: { limit?: number; cursor?: string }) => listByUser(userId, p);
export const openDirectMessage = (a: string, b: string) => upsertDM(a, b);
export const getMessages = listMessages;
export const sendMessage = appendMessage;

// Platzhalter
export const setArchived = async (_chatId: string, _userId: string, _to: boolean) => {};
export const setMuted    = async (_chatId: string, _userId: string, _to: boolean) => {};
export const leaveThread = async (_chatId: string, _userId: string) => {};
export const deleteThread= async (_chatId: string, _userId: string) => {};
export const attachMedia = async (_chatId: string, _userId: string, _urls: string[]) => {};