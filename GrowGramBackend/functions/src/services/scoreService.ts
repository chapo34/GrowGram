// src/services/scoreService.ts

type MaybeTS = {
  toDate?: () => Date;
  toMillis?: () => number;
};

/**
 * Robuste Zeitdifferenz: akzeptiert ISO, Date, Firestore Timestamp-like.
 */
function hoursSince(createdAt: unknown): number {
  try {
    if (!createdAt) return 1e6;

    // Firestore Timestamp?
    const ts = createdAt as MaybeTS;
    if (typeof ts?.toMillis === 'function') {
      return (Date.now() - ts.toMillis()) / 36e5;
    }
    if (typeof ts?.toDate === 'function') {
      const d = ts.toDate();
      return (Date.now() - d.getTime()) / 36e5;
    }

    // Date | ISO | number
    if (createdAt instanceof Date) {
      return (Date.now() - createdAt.getTime()) / 36e5;
    }
    if (typeof createdAt === 'number') {
      return (Date.now() - createdAt) / 36e5;
    }
    const t = new Date(String(createdAt)).getTime();
    return Number.isFinite(t) ? (Date.now() - t) / 36e5 : 1e6;
  } catch {
    return 1e6;
  }
}

/**
 * Simple Score: Likes + (Views/10) – Altersabzug (ab 24h)
 * → deterministic & nachvollziehbar; leicht zu tunen.
 */
export function scorePost(p: any): number {
  const likes = Number(p?.likes ?? p?.likesCount ?? 0);
  const views = Number(p?.views ?? 0);
  const ageH = hoursSince(p?.createdAt);

  const freshnessPenalty = Math.max(0, ageH - 24) * 0.5; // nach 24h fällt es leicht
  const raw = likes + views / 10 - freshnessPenalty;

  // Begrenzen und auf 2 Nachkommastellen runden
  const clamped = Math.max(-9999, Math.min(9999, raw));
  return Math.round(clamped * 100) / 100;
}