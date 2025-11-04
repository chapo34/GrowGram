import { z } from 'zod';

const zTrim = () => z.string().trim();

export const PaginationQuery = z.object({
  limit : z.coerce.number().int().min(1).max(200).default(20),
  cursor: zTrim().optional(),
});

export const TagQuery = z.object({
  tag: zTrim().max(40).optional(),
});

export const SearchQuery = z.object({
  q     : zTrim().min(1),
  limit : z.coerce.number().int().min(1).max(200).default(20).optional(),
  cursor: zTrim().optional(),
  tag   : zTrim().max(40).optional(),
  mode  : z.enum(['prefix', 'exact', 'tag']).default('prefix').optional(),
});

export type TPaginationQuery = z.infer<typeof PaginationQuery>;
export type TTagQuery        = z.infer<typeof TagQuery>;
export type TSearchQuery     = z.infer<typeof SearchQuery>;