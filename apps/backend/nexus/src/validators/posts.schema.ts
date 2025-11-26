// src/validators/posts.schema.ts
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
  filename: zTrim().max(140).default('upload.jpg'),
  visibility: z.enum(['public', 'private']).default('public'),
  text: zTrim().max(2000).optional(),
  tags: zTrim()
    .transform((raw) => {
      if (!raw) return [] as string[];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map(String)
            .map((t) => t.trim())
            .filter(Boolean);
        }
      } catch {
        /* fallthrough */
      }
      return String(raw)
        .split(/[,#\s]+/g)
        .map((t) => t.trim())
        .filter(Boolean);
    })
    .optional(),
  folder: zTrim().max(80).default('uploads'),
});

/** PATCH /posts/:postId */
export const PostPatchBody = z.object({
  visibility: z.enum(['public', 'private']).optional(),
});

/** POST /posts/:postId/comments */
export const CommentCreateBody = z.object({
  text: zTrim().min(1).max(1000),
});

export type TUploadBinaryQuery = z.infer<typeof UploadBinaryQuery>;
export type TPostPatchBody = z.infer<typeof PostPatchBody>;
export type TCommentCreateBody = z.infer<typeof CommentCreateBody>;
export type TPostIdParam = z.infer<typeof PostIdParam>;
export type TCommentIdParam = z.infer<typeof CommentIdParam>;

/**
 * Create-Post-Body für /api/posts
 *
 * Wichtig:
 * - media = Array (Carousel, mehrere Bilder/Videos)
 * - visibility = public / followers / private
 * - isAdultOnly + minAge/adultOnly/audience → gehen in ageGate/normalizePostAgeMeta
 */
export const CreateBody = z.object({
  caption: z.string().max(2200).optional(),
  tags: z.array(z.string().min(1).max(64)).max(30).optional(),
  visibility: z
    .enum(['public', 'followers', 'private'])
    .default('public'),

  // Medien, die schon irgendwo gehostet sind (Storage, CDN, ...)
  media: z
    .array(
      z.object({
        type: z.enum(['image', 'video']),
        url: z.string().url(),
        aspectRatio: z.number().positive().max(3).optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
    )
    .min(1)
    .max(10),

  // optionaler Standort
  location: z
    .object({
      name: z.string().max(128),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .partial()
    .optional(),

  // ⚠️ Client-Flag: "das ist 18+ / Adult Content"
  // Backend verlässt sich NICHT nur darauf, sondern nutzt AgeTier + AgeMeta
  isAdultOnly: z.boolean().optional(),

  // 🔞 Alters-Metadaten für Age-Gate (werden normalisiert)
  minAge: z.number().int().min(0).max(21).optional(),
  adultOnly: z.boolean().optional(), // "nur 18+ Bereich" (zusätzlich zu isAdultOnly)
  audience: z.enum(['ALL', '16+', '18+']).optional(),

  // Client-Meta (für Logging/Analyse, kein Muss)
  client: z
    .object({
      device: z.string().max(128).optional(), // "iPhone 16 Pro", "Pixel 9", "Web/Chrome"
      appVersion: z.string().max(32).optional(),
      locale: z.string().max(16).optional(),
    })
    .optional(),
});

export type CreateBodyT = z.infer<typeof CreateBody>;