// minimales API-Layer für Kommentare – an eure Functions anpassen
export type CommentItem = {
  id: string;
  user: { id: string; name: string; avatarUrl?: string };
  text: string;
  createdAt: number; // ms
  likes: number;
  viewerHasLiked: boolean;
};

export async function fetchCommentsPage(
  postId: string,
  params: { cursor?: string | null; limit?: number } = {}
): Promise<{ items: CommentItem[]; nextCursor?: string | null }> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await fetch(`/api/posts/${postId}/comments?` + qs.toString());
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

export async function createComment(postId: string, text: string): Promise<CommentItem> {
  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to create comment');
  return res.json();
}