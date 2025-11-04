import { db, nowISO, FieldValue } from '../config/firebase.js';

export type Comment = {
  id: string;
  postId: string;
  text: string;
  author: { id: string; name: string; avatarUrl: string };
  likesCount: number;
  liked: boolean;
  createdAt: string;
};

const COMMENTS = db.collection('comments');

function map(d: FirebaseFirestore.DocumentSnapshot): Comment {
  const x: any = d.data() || {};
  return {
    id: d.id,
    postId: String(x.postId || ''),
    text: String(x.text || ''),
    author: x.author || { id: '', name: '', avatarUrl: '' },
    likesCount: Number(x.likesCount || 0),
    liked: !!x.liked,
    createdAt: x.createdAt || nowISO(),
  };
}

export async function listByPost(postId: string, limit = 30, cursor?: string) {
  let q: FirebaseFirestore.Query = COMMENTS.where('postId', '==', String(postId))
    .orderBy('createdAt', 'desc')
    .limit(limit);
  if (cursor) {
    const cur = await COMMENTS.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const snap = await q.get();
  return {
    comments: snap.docs.map(map),
    nextCursor: snap.size === limit ? snap.docs.at(-1)!.id : null,
  };
}

export async function create(postId: string, author: Comment['author'], text: string) {
  const payload = { postId, author, text, likesCount: 0, liked: false, createdAt: nowISO() };
  const ref = await COMMENTS.add(payload);
  return { id: ref.id, ...payload } as Comment;
}

export async function like(commentId: string, userId: string) {
  await COMMENTS.doc(commentId).set(
    { likesCount: FieldValue.increment(1), [`likes.${userId}`]: true },
    { merge: true },
  );
}
export async function unlike(commentId: string, userId: string) {
  await COMMENTS.doc(commentId).set(
    { likesCount: FieldValue.increment(-1), [`likes.${userId}`]: FieldValue.delete() as any },
    { merge: true },
  );
}