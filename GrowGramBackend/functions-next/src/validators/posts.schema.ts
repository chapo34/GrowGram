import { z } from 'zod';

const zTrim = () => z.string().trim();

export const PostIdParam = z.object({
  postId: zTrim().min(8),
});

export const CommentIdParam = z.object({
  commentId: zTrim().min(8),
});

/** Query für /posts/upload-binary */
export const UploadBinaryQuery = z.object({
  filename  : zTrim().max(140).default('upload.jpg'),
  visibility: z.enum(['public', 'private']).default('public'),
  text      : zTrim().max(2000).optional(),
  tags      : zTrim().transform((raw) => {
    if (!raw) return [] as string[];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(t => t.trim()).filter(Boolean);
      }
    } catch { /* fallthrough */ }
    return String(raw).split(/[,#\s]+/g).map(t => t.trim()).filter(Boolean);
  }).optional(),
  folder    : zTrim().max(80).default('uploads'),
});

/** PATCH /posts/:postId */
export const PostPatchBody = z.object({
  visibility: z.enum(['public', 'private']).optional(),
});

/** POST /posts/:postId/comments */
export const CommentCreateBody = z.object({
  text: zTrim().min(1).max(1000),
});

export type TUploadBinaryQuery   = z.infer<typeof UploadBinaryQuery>;
export type TPostPatchBody       = z.infer<typeof PostPatchBody>;
export type TCommentCreateBody   = z.infer<typeof CommentCreateBody>;
export type TPostIdParam         = z.infer<typeof PostIdParam>;
export type TCommentIdParam      = z.infer<typeof CommentIdParam>;