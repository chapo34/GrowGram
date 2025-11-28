// src/core/backend/feedApi.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@core/http/httpClient';
import type { FeedPost, Comment } from './types';

export async function fetchTrendingPage(
  limit = 20,
  cursor?: string,
  tag?: string
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const params: any = { limit };
  if (cursor) params.cursor = cursor;
  if (tag) params.tag = tag;

  const { data } = await api.get('/feed/trending', { params });
  return data as { posts: FeedPost[]; nextCursor: string | null };
}

export async function fetchTrendingTags(
  limit = 16
): Promise<{ tag: string; count: number }[]> {
  const { data } = await api.get('/feed/trending-tags', { params: { limit } });
  return (data?.tags ?? []) as { tag: string; count: number }[];
}

export async function fetchForYou(
  cursor?: string,
  limit = 20
): Promise<{ posts: FeedPost[]; nextCursor?: string | null }> {
  const { data } = await api.get('/feed/for-you', { params: { cursor, limit } });
  return data as { posts: FeedPost[]; nextCursor?: string | null };
}

export async function likePost(
  postId: string
): Promise<{ likesCount?: number }> {
  try {
    const { data } = await api.post(`/posts/${postId}/like`);
    return data;
  } catch {
    return {};
  }
}

export async function unlikePost(
  postId: string
): Promise<{ likesCount?: number }> {
  try {
    const { data } = await api.post(`/posts/${postId}/unlike`);
    return data;
  } catch {
    return {};
  }
}

const localCommentKey = (postId: string) => `GG_COMMENTS_${postId}`;

export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const { data } = await api.get(`/posts/${postId}/comments`);
    return (data?.comments ?? []) as Comment[];
  } catch {
    const raw = await AsyncStorage.getItem(localCommentKey(postId));
    return raw ? (JSON.parse(raw) as Comment[]) : [];
  }
}

export async function addComment(
  postId: string,
  text: string
): Promise<Comment> {
  const payload = { text };
  try {
    const { data } = await api.post(`/posts/${postId}/comments`, payload);
    return data?.comment as Comment;
  } catch {
    const now = new Date().toISOString();
    const c: Comment = {
      id: `${Date.now()}`,
      postId,
      text,
      author: { name: 'Du' },
      createdAt: now,
      likesCount: 0,
      liked: false,
    };
    const cur = await getComments(postId);
    const next = [c, ...cur];
    await AsyncStorage.setItem(localCommentKey(postId), JSON.stringify(next));
    return c;
  }
}

export async function likeComment(postId: string, commentId: string) {
  try {
    const { data } = await api.post(
      `/posts/${postId}/comments/${commentId}/like`
    );
    return data;
  } catch {
    return {};
  }
}

export async function unlikeComment(postId: string, commentId: string) {
  try {
    const { data } = await api.post(
      `/posts/${postId}/comments/${commentId}/unlike`
    );
    return data;
  } catch {
    return {};
  }
}

export async function searchPostsPage(
  q: string,
  limit = 20,
  cursor?: string,
  tag?: string,
  mode: 'prefix' | 'exact' | 'tag' = 'prefix'
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const query = q.trim();
  if (!query) return { posts: [], nextCursor: null };

  const params: any = { q: query, limit };
  if (cursor) params.cursor = cursor;
  if (tag) params.tag = tag;

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const TAG_WORDS = new Set([
    'sativa',
    'indica',
    'hybrid',
    'haze',
    'kush',
    'cali',
    'indoor',
    'outdoor',
  ]);

  let finalMode = mode;
  if (finalMode === 'prefix' && tokens.length === 1 && TAG_WORDS.has(tokens[0])) {
    finalMode = 'tag';
  }
  params.mode = finalMode;

  try {
    const { data } = await api.get('/feed/search', { params });
    const posts = (data?.posts ?? data?.results ?? []) as FeedPost[];
    const nextCursor = (data?.nextCursor ?? data?.next ?? null) as string | null;
    return { posts, nextCursor };
  } catch {
    try {
      const { posts } = await fetchTrendingPage(60, undefined, tag);
      const needle = query.toLowerCase();
      const filtered =
        (posts ?? []).filter((p) => {
          const t = (p.text || '').toLowerCase();
          const tg = (p.tags || []).join(' ').toLowerCase();
          return t.includes(needle) || tg.includes(needle);
        }) || [];
      return { posts: filtered.slice(0, limit), nextCursor: null };
    } catch {
      return { posts: [], nextCursor: null };
    }
  }
}