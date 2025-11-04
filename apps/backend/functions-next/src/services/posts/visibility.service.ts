// src/services/posts/visibility.service.ts
import * as Posts from '../../repositories/posts.repo.js';

export async function setVisibility(postId: string, userId: string, visibility: 'public'|'private') {
  if (!['public','private'].includes(visibility)) throw new Error('invalid_visibility');
  await Posts.setPostVisibility(postId, userId, visibility);
  return { ok: true };
}