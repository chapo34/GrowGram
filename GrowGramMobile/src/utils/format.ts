import { UserLite } from '../types/chat';

/**
 * Generiert eine Vorschau für Nachrichten im Chat-UI
 */
export function previewText(txt?: string): string {
  const t = (txt || '').trim();
  if (!t) return 'Neue Unterhaltung';
  if (/https?:\/\/\S+/.test(t)) return '🔗 Link';
  if (/^\[?(image|photo|img)\]?/i.test(t)) return '🖼️ Foto';
  if (/^\[?(video|vid)\]?/i.test(t)) return '🎞️ Video';
  if (/^\[?(audio|voice)\]?/i.test(t)) return '🎤 Audio';
  if (/^\[?(file|doc)\]?/i.test(t)) return '📄 Datei';
  return t;
}

/**
 * Erzeugt den Anzeigenamen eines Nutzers
 */
export function nameOfUser(u: UserLite): string {
  return (
    u.username ||
    [u.firstName, u.lastName].filter(Boolean).join(' ') ||
    'Unbekannt'
  );
}

/**
 * Optimiert Bild-URLs mit Parametern für CDN/Performance
 */
export function safeUrl(u?: string | null, w = 128): string {
  if (!u) return '';
  try {
    const url = new URL(u);
    if (!url.searchParams.get('w')) url.searchParams.set('w', String(w));
    if (!url.searchParams.get('q')) url.searchParams.set('q', '85');
    if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
    return url.toString();
  } catch {
    return u || '';
  }
}