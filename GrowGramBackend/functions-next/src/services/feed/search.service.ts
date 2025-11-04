// src/services/feed/search.service.ts
import * as Posts from '../../repositories/posts.repo.js';

export async function searchPosts(params: {
  q: string; limit?: number; cursor?: string; tag?: string; mode?: 'prefix'|'exact'|'tag';
}) {
  const { q } = params;
  if (!q || !q.trim()) return { posts: [], nextCursor: null };
  return Posts.searchPosts(params);
}