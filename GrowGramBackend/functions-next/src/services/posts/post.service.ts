import * as Posts from '../../repositories/posts.repo.js';
import type { FeedPost } from '../../repositories/posts.repo.js';

export const myPosts = (userId: string, limit = 20, cursor?: string, visibility?: 'public'|'private') =>
  Posts.fetchMyPosts(userId, { limit, cursor, visibility });

export const byUser = (userId: string, limit = 20, cursor?: string, visibility?: 'public'|'private') =>
  Posts.fetchPostsByUser(userId, { limit, cursor, visibility });

export const like = (postId: string, userId: string) => Posts.likePost(postId, userId);
export const unlike = (postId: string, userId: string) => Posts.unlikePost(postId, userId);
export const remove = (postId: string, userId: string) => Posts.deletePost(postId, userId);