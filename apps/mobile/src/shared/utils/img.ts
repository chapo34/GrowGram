export const normalizeImageUrl = (url: string | null | undefined, bust?: number): string => {
  if (!url) return '';
  const u = url.trim();
  if (!u) return '';
  const sep = u.includes('?') ? '&' : '?';
  return bust ? `${u}${sep}t=${bust}` : u;
};