// src/models/postModel.ts
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

export type Visibility = 'public' | 'private';

export type PostDoc = {
  authorId: string;
  text?: string;
  mediaUrls?: string[];
  tags?: string[];
  likesCount?: number;
  commentsCount?: number;
  score?: number;
  visibility: Visibility;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
};

export type Post = {
  id: string;
  authorId: string;
  text?: string;
  mediaUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  score: number;
  visibility: Visibility;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt?: string | null;
};

const toISO = (t?: Timestamp | null) => (t ? t.toDate().toISOString() : undefined);

export const postConverter = {
  toFirestore(p: Partial<Post>): DocumentData {
    const now = FieldValue.serverTimestamp();
    const doc: Partial<PostDoc> = {
      authorId: p.authorId!,
      text: p.text,
      mediaUrls: p.mediaUrls ?? [],
      tags: p.tags ?? [],
      likesCount: p.likesCount ?? 0,
      commentsCount: p.commentsCount ?? 0,
      score: p.score ?? 0,
      visibility: p.visibility ?? 'public',
      updatedAt: now as any,
      ...(p.createdAt ? {} : { createdAt: now as any }),
      deletedAt: p.deletedAt ? Timestamp.fromDate(new Date(p.deletedAt)) : undefined,
    };
    return doc as DocumentData;
  },

  fromFirestore(snap: QueryDocumentSnapshot<PostDoc>): Post {
    const d = snap.data();
    return {
      id: snap.id,
      authorId: d.authorId,
      text: d.text,
      mediaUrls: d.mediaUrls ?? [],
      tags: d.tags ?? [],
      likesCount: d.likesCount ?? 0,
      commentsCount: d.commentsCount ?? 0,
      score: d.score ?? 0,
      visibility: d.visibility ?? 'public',
      createdAt: toISO(d.createdAt) || new Date(0).toISOString(),
      updatedAt: toISO(d.updatedAt) || new Date(0).toISOString(),
      deletedAt: d.deletedAt ? toISO(d.deletedAt)! : null,
    };
  },
};

export const postsCol = () => db.collection('posts').withConverter(postConverter);
export const postRef = (id: string) => postsCol().doc(id);

// Subcollection „comments“ unter einem Post
export const postCommentsCol = (postId: string) =>
  postsCol().doc(postId).collection('comments');