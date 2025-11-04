import { z } from 'zod';

const zTrim = () => z.string().trim();

/** GET/PATCH /users/me, GET /users/:userId */
export const UserIdParam = z.object({
  userId: zTrim().min(6),
});

/** PATCH body */
export const UserPatchBody = z.object({
  firstName     : zTrim().min(2).max(60).optional(),
  lastName      : zTrim().min(2).max(60).optional(),
  username      : zTrim().min(3).max(30).regex(/^[a-z0-9._]+$/i).optional(),
  city          : zTrim().max(60).optional(),
  birthDate     : z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bio           : zTrim().max(300).optional(),
  avatarUrl     : zTrim().url().optional(),
  privateProfile: z.boolean().optional(),
  hideSensitive : z.boolean().optional(),
  pushOptIn     : z.boolean().optional(),
});

/** Query für Avatar Binary Upload */
export const AvatarBinaryQuery = z.object({
  filename: zTrim().max(120).default('avatar.jpg'),
});

export type TUserPatchBody      = z.infer<typeof UserPatchBody>;
export type TUserIdParam        = z.infer<typeof UserIdParam>;
export type TAvatarBinaryQuery  = z.infer<typeof AvatarBinaryQuery>;