import type { Timestamp } from 'firebase-admin/firestore';

export const now = () => new Date();
export const nowIso = () => new Date().toISOString();

export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
export const addHours   = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
export const addDays    = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export const toIsoDate = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

export const fromISO = (s: string) => new Date(s);

/** Lazy: Firestore Timestamp erzeugen ohne harten Import oben. */
export async function toTimestamp(date: Date = now()): Promise<Timestamp> {
  const { Timestamp } = await import('firebase-admin/firestore');
  return Timestamp.fromDate(date);
}