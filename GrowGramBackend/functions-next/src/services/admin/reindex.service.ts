// src/services/admin/reindex.service.ts
import * as Posts from '../../repositories/posts.repo.js';

export async function reindexAll(limit = 500) {
  // Beispiel: Score neu berechnen (vereinfachte Heuristik)
  const { posts } = await Posts.fetchTrending({ limit: Math.min(limit, 500) });
  let updated = 0;
  for (const p of posts) {
    const score = (Number(p.likesCount || 0) * 3) + Number(p.commentsCount || 0);
    await Posts.updatePostScore(p.id, score);
    updated++;
  }
  return { ok: true, updated };
}