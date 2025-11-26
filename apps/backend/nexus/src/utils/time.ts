// backend/nexus/src/utils/time.ts
import { Timestamp } from 'firebase-admin/firestore';

/** Aktuelle JS-Date */
export const now = (): Date => new Date();

/** ISO-String für "jetzt" */
export const nowISO = (): string => now().toISOString();

/**
 * Liefert einen Firestore-Timestamp (als Promise, um die bestehende Signatur beizubehalten).
 * Hinweis: Timestamp.fromDate(...) ist synchron; async/Promise ist für Call-Sites kompatibel.
 */
export async function toTimestamp(date: Date = now()): Promise<FirebaseFirestore.Timestamp> {
  return Timestamp.fromDate(date);
}

/** Timestamp aus Millisekunden */
export function fromMillis(ms: number): FirebaseFirestore.Timestamp {
  return Timestamp.fromMillis(ms);
}

/** Hilfsfunktion: Firestore-Timestamp → ISO-String */
export function tsToISO(t?: FirebaseFirestore.Timestamp | null): string | undefined {
  return t ? t.toDate().toISOString() : undefined;
}