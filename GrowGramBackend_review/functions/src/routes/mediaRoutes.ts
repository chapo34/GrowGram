// functions/src/routes/mediaRoutes.ts
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { admin, bucket as exportedBucket } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = Router();

// ---- GCS Bucket stabilisieren (Warm Cache)
const gcsBucket =
  exportedBucket ??
  (global as any).__gg_bucket ??
  ((admin as any).storage && (admin as any).storage().bucket());
(global as any).__gg_bucket = gcsBucket;

function getAuthUid(req: any): string {
  const hdr = String(req.headers.authorization || '');
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const p: any = verifyToken(token);
  const uid = p.userId || p.uid || p.id;
  if (!uid) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return uid;
}

function sanitizeFolder(raw?: string): string {
  const f = String(raw || '').trim().replace(/(^\/+|\/+$)/g, '');
  if (!f) return 'uploads';
  return f
    .split('/')
    .map(seg => seg.replace(/[^\w\-]+/g, '_'))
    .filter(Boolean)
    .join('/');
}

function safeName(name: string) {
  return (name || 'file.bin').replace(/[^\w.\-]+/g, '_');
}

/**
 * GET /files/signed-get?path=<storage_path>&expires=<sec>
 * Liefert einen signierten READ-URL (v4) für existierende Dateien.
 * Auth: erforderlich (einfacher Schutz gegen Scraping).
 */
router.get('/signed-get', async (req, res) => {
  try {
    getAuthUid(req); // nur Validierung; Wert wird hier nicht verwendet
    if (!gcsBucket || !gcsBucket.name) {
      return res.status(500).json({ error: 'storage_not_configured' });
    }

    const path = String(req.query.path || '');
    if (!path) return res.status(400).json({ error: 'path_required' });

    const expiresSec = Math.max(60, Math.min(60 * 60 * 6, Number(req.query.expires) || 900));
    const [url] = await gcsBucket.file(path).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresSec * 1000,
    });

    return res.json({ ok: true, url, expires: expiresSec });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'signed_get_failed', details: String(e?.message || e) });
  }
});

/**
 * POST /files/signed-put
 * Body/JSON: { filename: string, contentType?: string, folder?: string }
 * Ergebnis: { url, path, expires }
 * → Client kann via HTTP PUT direkt in den Bucket hochladen.
 */
router.post('/signed-put', async (req, res) => {
  try {
    const uid = getAuthUid(req);
    if (!gcsBucket || !gcsBucket.name) {
      return res.status(500).json({ error: 'storage_not_configured' });
    }

    const filename = safeName(String(req.body?.filename || 'upload.bin'));
    const contentType = String(req.body?.contentType || 'application/octet-stream');
    const folder = sanitizeFolder(String(req.body?.folder || 'uploads'));

    const ts = Date.now();
    const unique = `${ts}_${uuidv4().slice(0, 8)}_${filename}`;
    const destPath = `${folder}/${uid}/${unique}`;

    const expiresSec = 15 * 60; // 15min
    const [url] = await gcsBucket.file(destPath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresSec * 1000,
      contentType,
    });

    // Optional: Metadaten/Lifecycle werden beim finalen Save gesetzt (PUT Header).
    return res.status(201).json({ ok: true, url, path: destPath, expires: expiresSec, contentType });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'signed_put_failed', details: String(e?.message || e) });
  }
});

export default router;