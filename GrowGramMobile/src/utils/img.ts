// Vereinheitlicht die Bild-URLs (Unsplash/Pexels/Pixabay) für RN/Expo
export function normalizeImageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  try {
    const url = new URL(String(u));
    const host = url.hostname;
    const looksLikeImgix = host.includes('unsplash.com') || url.searchParams.has('auto');
    if (looksLikeImgix) {
      url.searchParams.delete('auto');
      if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
      if (!url.searchParams.get('q'))  url.searchParams.set('q',  '85');
      if (!url.searchParams.get('w'))  url.searchParams.set('w',  '1600');
    }
    return url.toString();
  } catch {
    // Fallback für „rohe“ Strings
    let s = String(u);
    s = s.replace(/([?&])auto=[^&]+/g, '$1');
    const sep = s.includes('?') ? '&' : '?';
    if (!/[?&]fm=/.test(s)) s += `${sep}fm=jpg`;
    if (!/[?&]q=/.test(s))  s += `&q=85`;
    if (!/[?&]w=/.test(s))  s += `&w=1600`;
    return s.replace(/[?&]$/, '');
  }
}