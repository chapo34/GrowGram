// functions/src/routes/avatarRoutes.ts
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { admin, db, bucket as exportedBucket } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = Router();

// GCS Bucket stabil halten (Warm Cache)
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

async function readRequestBuffer(req: any): Promise<Buffer> {
  // In Firebase Functions existiert rawBody (auch bei non-JSON)
  const raw = (req as any).rawBody;
  if (raw) return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  // Fallback: Stream lesen (lokal)
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/**
 * POST /auth/avatar-binary
 * Header: Authorization: Bearer <token>, Content-Type: image/*
 * Query:  ?filename=avatar.jpg
 * Body:   reines Binary (kein multipart)
 */
router.post('/avatar-binary', async (req, res) => {
  try {
    const uid = getAuthUid(req);
    if (!gcsBucket || !gcsBucket.name) {
      return res.status(500).json({ error: 'storage_not_configured' });
    }

    const buf = await readRequestBuffer(req);
    if (!buf?.length) return res.status(400).json({ error: 'empty_body' });

    const mime = (req.header('content-type') || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      return res.status(400).json({ error: 'invalid_mime', details: mime });
    }

    const q = req.query as Record<string, string | undefined>;
    const filename = (q.filename || 'avatar.jpg').replace(/[^\w.\-]+/g, '_');

    const ts = Date.now();
    const path = `avatars/${uid}/${ts}_${filename}`;
    const dlToken = uuidv4();

    await gcsBucket.file(path).save(buf, {
      resumable: false,
      metadata: {
        contentType: mime,
        metadata: { firebaseStorageDownloadTokens: dlToken, uploadedBy: uid },
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });

    const url =
      `https://firebasestorage.googleapis.com/v0/b/${gcsBucket.name}/o/` +
      `${encodeURIComponent(path)}?alt=media&token=${dlToken}`;

    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(uid).set(
      {
        avatarUrl: url,
        avatarMeta: { mime, size: buf.length, path, filename },
        updatedAt: now,
      },
      { merge: true }
    );

    return res.status(201).json({ ok: true, url, path });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'avatar_upload_failed', details: String(e?.message || e) });
  }
});

export default router;