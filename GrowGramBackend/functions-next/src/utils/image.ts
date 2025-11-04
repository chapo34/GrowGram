const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const isImageMime = (m?: string | null) => !!m && IMAGE_MIME.has(m);

export function extFromMime(mime?: string | null): '.jpg' | '.png' | '.webp' | '.bin' {
  if (!mime) return '.bin';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '.bin';
}

export function ensureJpgFilename(name: string) {
  return name.replace(/\.(jpeg|jpg|png|webp)$/i, '') + '.jpg';
}

export function joinPath(...parts: string[]) {
  return parts.join('/').replace(/\/{2,}/g, '/').replace(/^\/+/, '');
}

/** z.B. `uploads/{uid}/{yyyy-mm-dd}/file.jpg` */
export function makeStoragePath(opts: { folder: string; uid: string; filename: string; date?: Date }) {
  const d = opts.date || new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return joinPath(opts.folder, opts.uid, `${yyyy}-${mm}-${dd}`, opts.filename);
}