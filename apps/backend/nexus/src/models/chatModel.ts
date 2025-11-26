// src/models/chatModel.ts
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

export type ChatType = 'dm' | 'group';

export type ChatDoc = {
  type: ChatType;
  name?: string | null;             // nur bei group
  memberIds: string[];              // User IDs
  lastMessage?: {
    text?: string;
    senderId?: string;
    createdAt?: Timestamp;
  } | null;
  lastMessageAt?: Timestamp | null;
  unread?: Record<string, number>;  // userId -> count
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedBy?: string[];            // userIds, optional
  mutedBy?: string[];               // userIds, optional
};

export type Chat = {
  id: string;
  type: ChatType;
  name?: string | null;
  memberIds: string[];
  lastMessage?: {
    text?: string;
    senderId?: string;
    createdAt?: string; // ISO
  } | null;
  lastMessageAt?: string | null;
  unread?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  archivedBy?: string[];
  mutedBy?: string[];
};

export type ChatMessageDoc = {
  chatId: string;
  senderId: string;
  type: 'text';              // erweiterbar: 'image', 'audio'...
  text?: string;
  mediaUrls?: string[];
  readBy?: string[];         // userIds
  createdAt: Timestamp;
  editedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  type: 'text';
  text?: string;
  mediaUrls?: string[];
  readBy?: string[];
  createdAt: string;         // ISO
  editedAt?: string | null;
  deletedAt?: string | null;
};

const toISO = (t?: Timestamp | null) => (t ? t.toDate().toISOString() : undefined);

export const chatConverter = {
  toFirestore(c: Partial<Chat>): DocumentData {
    const now = FieldValue.serverTimestamp();
    const doc: Partial<ChatDoc> = {
      type: c.type ?? 'dm',
      name: c.name ?? null,
      memberIds: c.memberIds ?? [],
      lastMessage: c.lastMessage
        ? {
            text: c.lastMessage.text,
            senderId: c.lastMessage.senderId,
            createdAt: c.lastMessage.createdAt
              ? Timestamp.fromDate(new Date(c.lastMessage.createdAt))
              : undefined,
          }
        : null,
      lastMessageAt: c.lastMessageAt ? Timestamp.fromDate(new Date(c.lastMessageAt)) : null,
      unread: c.unread ?? {},
      updatedAt: now as any,
      ...(c.createdAt ? {} : { createdAt: now as any }),
      archivedBy: c.archivedBy ?? [],
      mutedBy: c.mutedBy ?? [],
    };
    return doc as DocumentData;
  },

  fromFirestore(snap: QueryDocumentSnapshot<ChatDoc>): Chat {
    const d = snap.data();
    return {
      id: snap.id,
      type: d.type ?? 'dm',
      name: d.name ?? null,
      memberIds: d.memberIds ?? [],
      lastMessage: d.lastMessage
        ? {
            text: d.lastMessage.text,
            senderId: d.lastMessage.senderId,
            createdAt: toISO(d.lastMessage.createdAt),
          }
        : null,
      lastMessageAt: d.lastMessageAt ? toISO(d.lastMessageAt)! : null,
      unread: d.unread ?? {},
      createdAt: toISO(d.createdAt) || new Date(0).toISOString(),
      updatedAt: toISO(d.updatedAt) || new Date(0).toISOString(),
      archivedBy: d.archivedBy ?? [],
      mutedBy: d.mutedBy ?? [],
    };
  },
};

export const chatCol = () => db.collection('chats').withConverter(chatConverter);
export const chatRef = (id: string) => chatCol().doc(id);

export const chatMessagesCol = (chatId: string) =>
  db.collection('chats').doc(chatId).collection('messages');

export const chatMessageConverter = {
  toFirestore(m: Partial<ChatMessage>): DocumentData {
    const doc: Partial<ChatMessageDoc> = {
      chatId: m.chatId!,
      senderId: m.senderId!,
      type: m.type ?? 'text',
      text: m.text,
      mediaUrls: m.mediaUrls ?? [],
      readBy: m.readBy ?? [],
      createdAt: m.createdAt
        ? Timestamp.fromDate(new Date(m.createdAt))
        : (FieldValue.serverTimestamp() as any),
      editedAt: m.editedAt ? Timestamp.fromDate(new Date(m.editedAt)) : null,
      deletedAt: m.deletedAt ? Timestamp.fromDate(new Date(m.deletedAt)) : null,
    };
    return doc as DocumentData;
  },

  fromFirestore(snap: QueryDocumentSnapshot<ChatMessageDoc>): ChatMessage {
    const d = snap.data();
    return {
      id: snap.id,
      chatId: d.chatId,
      senderId: d.senderId,
      type: d.type ?? 'text',
      text: d.text,
      mediaUrls: d.mediaUrls ?? [],
      readBy: d.readBy ?? [],
      createdAt: toISO(d.createdAt) || new Date(0).toISOString(),
      editedAt: d.editedAt ? toISO(d.editedAt)! : null,
      deletedAt: d.deletedAt ? toISO(d.deletedAt)! : null,
    };
  },
};