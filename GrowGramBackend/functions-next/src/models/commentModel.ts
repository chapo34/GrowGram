// src/models/commentModel.ts
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

export type CommentDoc = {
  postId: string;
  authorId: string;
  text: string;
  likesCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  likesCount: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt?: string | null;
};

const toISO = (t?: Timestamp | null) => (t ? t.toDate().toISOString() : undefined);

export const commentConverter = {
  toFirestore(c: Partial<Comment>): DocumentData {
    const now = FieldValue.serverTimestamp();
    const doc: Partial<CommentDoc> = {
      postId: c.postId!,
      authorId: c.authorId!,
      text: c.text!,
      likesCount: c.likesCount ?? 0,
      updatedAt: now as any,
      ...(c.createdAt ? {} : { createdAt: now as any }),
      deletedAt: c.deletedAt ? Timestamp.fromDate(new Date(c.deletedAt)) : undefined,
    };
    return doc as DocumentData;
  },

  fromFirestore(snap: QueryDocumentSnapshot<CommentDoc>): Comment {
    const d = snap.data();
    return {
      id: snap.id,
      postId: d.postId,
      authorId: d.authorId,
      text: d.text,
      likesCount: d.likesCount ?? 0,
      createdAt: toISO(d.createdAt) || new Date(0).toISOString(),
      updatedAt: toISO(d.updatedAt) || new Date(0).toISOString(),
      deletedAt: d.deletedAt ? toISO(d.deletedAt)! : null,
    };
  },
};

// Root-Collection für „flat“ Comments (falls du sie global indexierst)
export const commentsCol = () => db.collection('comments').withConverter(commentConverter);
export const commentRef = (id: string) => commentsCol().doc(id);

// Subcollection unter posts/{postId}/comments – falls du diese Struktur nutzt:
export const commentsSubCol = (postId: string) =>
  db.collection('posts').doc(postId).collection('comments').withConverter(commentConverter);