// src/services/scoreService.ts
export function scorePost(p: any): number {
  // super simpel: Likes + (Views/10) - Altersabzug
  const likes = Number(p.likes || 0);
  const views = Number(p.views || 0);
  const ageH = hoursSince(p.createdAt);
  const freshnessPenalty = Math.max(0, ageH - 24) * 0.5; // nach 24h fällt es leicht
  return likes + views / 10 - freshnessPenalty;
}

function hoursSince(iso?: string): number {
  if (!iso) return 9999;
  const t = new Date(iso).getTime();
  return (Date.now() - t) / 36e5;
}