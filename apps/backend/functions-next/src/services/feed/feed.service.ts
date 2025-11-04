// src/services/feed/feed.service.ts
import * as Posts from '../../repositories/posts.repo.js';

export async function trending(limit = 20, cursor?: string, tag?: string) {
  return Posts.fetchTrending({ limit, cursor, tag });
}

export async function trendingTags(limit = 16) {
  return Posts.listTrendingTags(limit);
}

export async function forYou(userId: string, limit = 20, cursor?: string) {
  return Posts.fetchForYou({ userId, limit, cursor });
}