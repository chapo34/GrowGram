// functions/src/controllers/postUploadController.ts
import type { Request, Response } from 'express';

import multer, { MulterError } from 'multer';
import type { FileFilterCallback } from 'multer';

import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../utils/jwtUtils.js';
import { admin, db, bucket } from '../config/firebase.js';

// erlaubte Bildtypen (Whitelist)
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// Multer: Arbeit im RAM, 10MB, nur Bildtypen
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    const ok = ALLOWED_MIME.has(file.mimetype);
    ok ? cb(null, true) : cb(new Error('unsupported_file_type'));
  },
});

// Wrapper, damit Multer-Fehler im try/catch landen
function parseMultipart(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const handler = upload.fields([
      { name: 'image', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]) as any;
    handler(req, res, (err: unknown) => (err ? reject(err) : resolve()));
  });
}

const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));

export async function postUpload(req: Request, res: Response) {
  try {
    // 1) Auth
    const hdr = String(req.headers.authorization || '');
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyToken(token) as any;
    const uid = payload.userId || payload.uid || payload.id;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    // 2) Multipart
    await parseMultipart(req, res);

    // 3) Datei (image ODER file)
    const files = (req as any).files as Record<string, Express.Multer.File[]>;
    const file: Express.Multer.File | undefined =
      files?.image?.[0] || files?.file?.[0] || (req as any).file;
    if (!file) return res.status(400).json({ error: 'image_required' });

    if (!bucket || !bucket.name) return res.status(500).json({ error: 'storage_not_configured' });

    // 4) Tags
    let tags: string[] = [];
    const rawTags = (req.body as any)?.tags;
    if (Array.isArray(rawTags)) tags = rawTags.map(String);
    else if (typeof rawTags === 'string' && rawTags) {
      try {
        const parsed = JSON.parse(rawTags);
        tags = Array.isArray(parsed) ? parsed.map(String) : rawTags.split(',').map((t) => t.trim());
      } catch {
        tags = rawTags.split(',').map((t) => t.trim());
      }
    }
    tags = uniq(tags).slice(0, 10);
    const tagsLower = tags.map(norm);

    // 5) Upload → Storage
    const ts = Date.now();
    const ext = file.mimetype.split('/')[1] || 'jpg';
    const safeName = (file.originalname || `image.${ext}`).replace(/[^\w.\-]+/g, '_');
    const objectPath = `uploads/${uid}/${ts}_${safeName}`;
    const dlToken = uuidv4();

    await bucket.file(objectPath).save(file.buffer, {
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: dlToken, uploadedBy: uid },
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });

    const url =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
      `${encodeURIComponent(objectPath)}?alt=media&token=${dlToken}`;

    // 6) Post in Firestore
    const now = admin.firestore.FieldValue.serverTimestamp();
    const visibility =
      String((req.body as any)?.visibility || 'public').toLowerCase() === 'private'
        ? 'private'
        : 'public';

    const docRef = await db.collection('posts').add({
      authorId: uid,
      text: String((req.body as any)?.text || '').slice(0, 1200),
      mediaUrls: [url],
      tags,
      tagsLower,
      visibility,
      likesCount: 0,
      commentsCount: 0,
      deleted: false,
      score: 0,
      createdAt: now,
      updatedAt: now,
      credit: null,
      meta: { mime: file.mimetype, size: file.size, filename: safeName, path: objectPath, token: dlToken },
    });

    return res.status(201).json({ ok: true, id: docRef.id, url, visibility });
  } catch (e: any) {
    const code =
      e instanceof MulterError
        ? 400
        : e?.message === 'unsupported_file_type'
        ? 415
        : e?.status || 500;
    return res.status(code).json({ error: 'upload_failed', details: String(e?.message || e) });
  }
}