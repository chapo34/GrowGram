/**
 * Posts Repository
 * - deckt alle von Services verwendeten Methoden ab
 * - Cursor-Pagination per Dokument
 * - Trending/ForYou/Search schlank implementiert
 */
import { db, FieldValue, nowISO } from '../config/firebase.js';

export type Visibility = 'public' | 'private';

export type FeedPost = {
  id: string;
  text: string;
  mediaUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  score: number;
  visibility: Visibility;
  createdAt: string;
  _liked?: boolean;
  authorId?: string;
};

const POSTS = db.collection('posts');

const S = (v: any, fb = '') => (typeof v === 'string' ? v : fb);
const A = <T>(v: any, map: (x: any) => T, fb: T[] = []) => (Array.isArray(v) ? v.map(map) : fb);
const N = (v: any, fb = 0) => (typeof v === 'number' ? v : fb);

function mapPost(doc: FirebaseFirestore.DocumentSnapshot): FeedPost {
  const d: any = doc.data() || {};
  return {
    id: doc.id,
    text: S(d.text),
    mediaUrls: A(d.mediaUrls, String),
    tags: A(d.tags, String),
    likesCount: N(d.likesCount),
    commentsCount: N(d.commentsCount),
    score: N(d.score),
    visibility: d.visibility === 'private' ? 'private' : 'public',
    createdAt: d.createdAt ?? nowISO(),
    _liked: !!d._liked,
    authorId: d.authorId ? String(d.authorId) : undefined,
  };
}

/** Create (binary-upload-svc ruft diese idR) */
export async function createPostRepo(
  userId: string | undefined,
  data: Partial<Pick<FeedPost, 'text' | 'mediaUrls' | 'tags' | 'visibility'>>,
): Promise<FeedPost> {
  const payload = {
    text: S(data.text),
    mediaUrls: A(data.mediaUrls, String),
    tags: A(data.tags, String),
    likesCount: 0,
    commentsCount: 0,
    score: 0,
    visibility: (data.visibility === 'private' ? 'private' : 'public') as Visibility,
    createdAt: nowISO(),
    authorId: userId ? String(userId) : undefined,
  };
  const ref = await POSTS.add(payload);
  return { id: ref.id, ...payload };
}

/** Visibility setzen (alias für Legacy-Route) */
export async function setPostVisibility(postId: string, userId: string, visibility: Visibility) {
  // (optional) Ownership check später einbauen
  await POSTS.doc(postId).set({ visibility }, { merge: true });
}

/** Like/Unlike */
export async function likePost(postId: string, userId: string) {
  await POSTS.doc(postId).set(
    { likesCount: FieldValue.increment(1), [`likes.${userId}`]: true },
    { merge: true },
  );
}
export async function unlikePost(postId: string, userId: string) {
  await POSTS.doc(postId).set(
    { likesCount: FieldValue.increment(-1), [`likes.${userId}`]: FieldValue.delete() as any },
    { merge: true },
  );
}

/** Delete */
export async function deletePost(postId: string, _userId: string) {
  await POSTS.doc(postId).delete();
}

/** My posts / posts by user */
export async function fetchMyPosts(
  userId: string,
  { limit = 20, cursor, visibility }: { limit?: number; cursor?: string; visibility?: Visibility },
) {
  let q: FirebaseFirestore.Query = POSTS.where('authorId', '==', String(userId))
    .orderBy('createdAt', 'desc')
    .limit(limit);
  if (visibility) q = q.where('visibility', '==', visibility);
  if (cursor) {
    const cur = await POSTS.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const snap = await q.get();
  return { posts: snap.docs.map(mapPost), nextCursor: snap.size === limit ? snap.docs.at(-1)!.id : null };
}

export async function fetchPostsByUser(
  userId: string,
  p: { limit?: number; cursor?: string; visibility?: Visibility },
) {
  return fetchMyPosts(userId, p);
}

/** Trending (Score/createdAt) */
export async function fetchTrending({ limit = 20, cursor, tag }: { limit?: number; cursor?: string; tag?: string }) {
  let q: FirebaseFirestore.Query = POSTS.where('visibility', '==', 'public')
    .orderBy('score', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (tag) q = q.where('tags', 'array-contains', String(tag));
  if (cursor) {
    const cur = await POSTS.doc(cursor).get();
    if (cur.exists) q = q.startAfter(cur);
  }
  const snap = await q.get();
  return { posts: snap.docs.map(mapPost), nextCursor: snap.size === limit ? snap.docs.at(-1)!.id : null };
}

/** For-You (Placeholder: aktuell == Trending) */
export async function fetchForYou({
  userId,
  limit = 20,
  cursor,
}: {
  userId: string;
  limit?: number;
  cursor?: string;
}) {
  return fetchTrending({ limit, cursor });
}

/** Search (prefix/exact/tag) */
export async function searchPosts(params: { q: string; mode?: 'prefix' | 'exact' | 'tag'; limit?: number; cursor?: string }) {
  const { q, mode = 'prefix', limit = 20, cursor } = params;

  let query: FirebaseFirestore.Query = POSTS.where('visibility', '==', 'public')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (mode === 'tag') {
    query = query.where('tags', 'array-contains', q);
  } else if (mode === 'exact') {
    query = query.where('text', '==', q);
  } else {
    // prefix: simple startsWith über naive index-Felder (optional)
    query = query.where('textPrefix', '==', q.slice(0, 3).toLowerCase());
  }

  if (cursor) {
    const cur = await POSTS.doc(cursor).get();
    if (cur.exists) query = query.startAfter(cur);
  }

  const snap = await query.get();
  return { posts: snap.docs.map(mapPost), nextCursor: snap.size === limit ? snap.docs.at(-1)!.id : null };
}

/** Trending Tags (count) – naive Aggregation */
export async function listTrendingTags(limit = 20) {
  const snap = await POSTS.where('visibility', '==', 'public').limit(500).get();
  const counts = new Map<string, number>();
  for (const d of snap.docs) {
    const tags: string[] = (d.get('tags') as any) || [];
    for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const arr = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
  return arr;
}

/** Reindex/Score Update (Admin) */
export async function updatePostScore(postId: string, score: number) {
  await POSTS.doc(postId).set({ score: Number(score) }, { merge: true });
}