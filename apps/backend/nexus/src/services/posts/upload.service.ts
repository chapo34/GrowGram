import * as Posts from '../../repositories/posts.repo.js';

export async function createFromBinary(input: {
  userId: string;
  mediaUrls: string[];
  text?: string;
  tags?: string[];
  visibility?: 'public'|'private';
}) {
  const post = await Posts.createPostRepo(input.userId, {
    text: input.text,
    mediaUrls: input.mediaUrls,
    tags: input.tags,
    visibility: input.visibility,
  });
  return post;
}