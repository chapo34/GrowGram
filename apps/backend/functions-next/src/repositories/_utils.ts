// src/repositories/_utils.ts
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { Query } from 'firebase-admin/firestore';

/** ISO ⇄ Firestore Timestamp */
export const tsFromISO = (iso?: string | null) =>
  (iso ? Timestamp.fromDate(new Date(iso)) : undefined)!;

export const isoFromTs = (t?: Timestamp | null) =>
  (t ? t.toDate().toISOString() : undefined);

/** Standard Paginierungs-Optionen */
export type PageOpts = {
  limit?: number;
  cursor?: string | null;
  order?: 'desc' | 'asc';
  cursorField?: string; // default 'createdAt'
};

export const DEFAULT_PAGE = (over?: PageOpts): Required<PageOpts> => ({
  limit: Math.min(Math.max(over?.limit ?? 20, 1), 200),
  cursor: over?.cursor ?? null,
  order: over?.order ?? 'desc',
  cursorField: over?.cursorField ?? 'createdAt',
});

/**
 * Baut eine Query mit Order + optionalem Cursor (string ISO)
 * Erwartet, dass das Feld `cursorField` ein Timestamp ist (z.B. createdAt).
 */
export function applyPaging<T>(
  q: Query<T>,
  opts?: PageOpts
): Query<T> {
  const cfg = DEFAULT_PAGE(opts);
  let qq = q.orderBy(cfg.cursorField, cfg.order);
  if (cfg.cursor) {
    const cts = tsFromISO(cfg.cursor);
    if (cts) {
      // startAfter bei desc bedeutet "älter als", bei asc "neuer als"
      qq = qq.startAfter(cts);
    }
  }
  return qq.limit(cfg.limit);
}

/** FieldValue Helper */
export const inc = (n: number) => FieldValue.increment(n);
export const now = () => FieldValue.serverTimestamp();