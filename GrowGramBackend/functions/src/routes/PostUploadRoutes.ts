// functions/src/routes/postUploadRoutes.ts
import { Router } from 'express';

// ✅ type-only Imports für Formidable-Types
import formidable from 'formidable';
import type { File as FFile, Fields, Files } from 'formidable';

import { readFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

import { verifyToken } from '../utils/jwtUtils.js';
import { admin, db, bucket as exportedBucket } from '../config/firebase.js';

const router = Router();

// ---- GCS Bucket stabil bereithalten (Warm-Start Cache)
const gcsBucket =
  exportedBucket ??
  (global as any).__gg_bucket ??
  ((admin as any).storage && (admin as any).storage().bucket());
(global as any).__gg_bucket = gcsBucket;

// ---- Helpers
const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));

function sanitizeFolder(raw?: string): string {
  const f = String(raw || '').trim().replace(/(^\/+|\/+$)/g, '');
  if (!f) return 'uploads';
  return f
    .split('/')
    .map((seg) => seg.replace(/[^\w\-]+/g, '_'))
    .filter(Boolean)
    .join('/');
}

function firstVal(v: unknown): string | undefined {
  if (Array.isArray(v)) return v[0] as string | undefined;
  return typeof v === 'string' ? v : v == null ? undefined : String(v);
}

function getAuthUid(req: any): string {
  const hdr = String(req.headers.authorization || '');
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const p: any = verifyToken(token);
  const uid = p.userId || p.uid || p.id;
  if (!uid) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return uid;
}

/** robustes Einlesen eines binären Bodys (ohne raw-body) */
async function readRequestBuffer(req: any): Promise<Buffer> {
  const raw = (req as any).rawBody;
  if (raw) return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

// ---- Multipart mit formidable (stabil hinter Proxies)
function parseForm(req: any): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 25 * 1024 * 1024,
    allowEmptyFiles: false,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

// ---- Sanitizer (EXIF strip, Mime-Whitelist, Größenlimit)
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
async function sanitizeImageBuf(buf: Buffer, mime: string): Promise<{ clean: Buffer; outMime: string }> {
  if (!ALLOWED.has(mime)) {
    throw Object.assign(new Error('unsupported_media_type'), { status: 415 });
  }
  try {
    const base = sharp(buf, { failOn: 'none' }).rotate().resize({ width: 2000, withoutEnlargement: true });
    if (mime.includes('png')) return { clean: await base.png({ compressionLevel: 9 }).toBuffer(), outMime: 'image/png' };
    if (mime.includes('webp')) return { clean: await base.webp({ quality: 85 }).toBuffer(), outMime: 'image/webp' };
    // Default → JPEG
    return { clean: await base.jpeg({ quality: 85 }).toBuffer(), outMime: 'image/jpeg' };
  } catch {
    return { clean: buf, outMime: mime };
  }
}

/**
 * POST /posts/upload    (multipart: image|file, text?, tags?, visibility?, folder?)
 */
router.post('/upload', async (req, res) => {
  try {
    const uid = getAuthUid(req);
    if (!gcsBucket || !gcsBucket.name) return res.status(500).json({ error: 'storage_not_configured' });

    const { fields, files } = await parseForm(req);

    const pick = (f?: FFile | FFile[]) => (Array.isArray(f) ? f[0] : f);
    const fileAny: FFile | undefined = pick(files['file'] as any) ?? pick(files['image'] as any);
    if (!fileAny) return res.status(400).json({ error: 'image_required' });

    const text = String(firstVal(fields['text']) ?? '').slice(0, 1200);

    let tags: string[] = [];
    const tagsField = fields['tags'];
    if (Array.isArray(tagsField)) tags = tagsField.map(String);
    else {
      const raw = firstVal(tagsField);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          tags = Array.isArray(parsed) ? parsed.map(String) : raw.split(',').map((t) => t.trim());
        } catch {
          tags = raw.split(',').map((t) => t.trim());
        }
      }
    }
    tags = uniq(tags).slice(0, 10);
    const tagsLower = tags.map(norm);

    const visibility = (firstVal(fields['visibility']) ?? 'public').toLowerCase() === 'private' ? 'private' : 'public';
    const folder = sanitizeFolder(firstVal(fields['folder']) ?? 'uploads');

    const srcBuf = await readFile((fileAny as any).filepath);
    const mime = (fileAny as any).mimetype || 'application/octet-stream';
    const { clean, outMime } = await sanitizeImageBuf(srcBuf, mime);

    const orig = (fileAny as any).originalFilename || 'image';
    const ext = (outMime.split('/')[1] || 'jpg').toLowerCase();
    const safeName = (orig.replace(/[^\w.\-]+/g, '_') || `image.${ext}`).replace(
      /\.(jpe?g|png|webp|heic|heif)$/i,
      `.${ext}`
    );

    const ts = Date.now();
    const destPath = `${folder}/${uid}/${ts}_${safeName}`;
    const dlToken = uuidv4();

    await gcsBucket.file(destPath).save(clean, {
      resumable: false,
      metadata: {
        contentType: outMime,
        metadata: { firebaseStorageDownloadTokens: dlToken, uploadedBy: uid, visibility },
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${gcsBucket.name}/o/${encodeURIComponent(
      destPath
    )}?alt=media&token=${dlToken}`;

    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = db.collection('posts').doc();
    await docRef.set({
      authorId: uid,
      text,
      mediaUrls: [publicUrl],
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
      meta: { mime: outMime, size: clean.length, filename: safeName, path: destPath },
    });

    return res.status(201).json({ ok: true, id: docRef.id, url: publicUrl, visibility, path: destPath });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'upload_failed', details: String(e?.message || e) });
  }
});

/**
 * POST /posts/upload-binary
 * Body: reines Binary (image/*)
 * Query: ?filename=&folder=&visibility=public|private&text=...&tags=[...]
 */
router.post('/upload-binary', async (req, res) => {
  try {
    const uid = getAuthUid(req);
    if (!gcsBucket || !gcsBucket.name) return res.status(500).json({ error: 'storage_not_configured' });

    const src = await readRequestBuffer(req);
    if (!src?.length) return res.status(400).json({ error: 'upload_failed', details: 'empty body' });

    const mimeHeader = req.header('content-type') || 'application/octet-stream';
    const { clean, outMime } = await sanitizeImageBuf(src, mimeHeader);

    const q = req.query as Record<string, string | undefined>;
    const filenameBase = (q.filename || 'image.jpg').replace(/[^\w.\-]+/g, '_');
    const visibility = (q.visibility || 'public').toLowerCase() === 'private' ? 'private' : 'public';
    const folder = sanitizeFolder(q.folder || 'uploads');

    const text = String(q.text || '').slice(0, 1200);
    let tags: string[] = [];
    if (q.tags) {
      try {
        const parsed = JSON.parse(q.tags);
        if (Array.isArray(parsed)) tags = parsed.map(String);
      } catch {}
    }
    tags = uniq(tags).slice(0, 10);
    const tagsLower = tags.map(norm);

    const ext = (outMime.split('/')[1] || 'jpg').toLowerCase();
    const filename = filenameBase.replace(/\.(jpe?g|png|webp|heic|heif)$/i, `.${ext}`);

    const ts = Date.now();
    const destPath = `${folder}/${uid}/${ts}_${filename}`;
    const dlToken = uuidv4();

    await gcsBucket.file(destPath).save(clean, {
      resumable: false,
      metadata: {
        contentType: outMime,
        metadata: { firebaseStorageDownloadTokens: dlToken, uploadedBy: uid, visibility },
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${gcsBucket.name}/o/${encodeURIComponent(
      destPath
    )}?alt=media&token=${dlToken}`;

    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = db.collection('posts').doc();
    await docRef.set({
      authorId: uid,
      text,
      mediaUrls: [publicUrl],
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
      meta: { mime: outMime, size: clean.length, filename, path: destPath },
    });

    return res.status(201).json({ ok: true, id: docRef.id, url: publicUrl, visibility, path: destPath });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'upload_failed', details: String(e?.message || e) });
  }
});

/* ========= LISTING ENDPOINTS ========= */

/** GET /posts/mine */
router.get('/mine', async (req, res) => {
  try {
    const uid = getAuthUid(req);
    const q = req.query as Record<string, any>;

    const limit = Math.min(parseInt(String(q.limit ?? '24'), 10) || 24, 60);
    const visibility = String(q.visibility ?? '').toLowerCase();
    const cursorMs = q.cursor ? Number(q.cursor) : NaN;

    let ref = db
      .collection('posts')
      .where('authorId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (!Number.isNaN(cursorMs) && cursorMs > 0) {
      ref = ref.startAfter(admin.firestore.Timestamp.fromMillis(cursorMs));
    }

    const snap = await ref.get();
    let posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    if (visibility === 'public') posts = posts.filter((p) => (p.visibility || 'public') === 'public');
    else if (visibility === 'private') posts = posts.filter((p) => (p.visibility || 'public') === 'private');

    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last?.get('createdAt')?.toMillis?.() ?? null;

    return res.json({ posts, nextCursor });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'list_failed', details: String(e?.message || e) });
  }
});

/** GET /posts/by-user/:uid */
router.get('/by-user/:uid', async (req, res) => {
  try {
    const viewer = getAuthUid(req);
    const profileUid = String(req.params.uid);
    const q = req.query as Record<string, any>;

    const limit = Math.min(parseInt(String(q.limit ?? '24'), 10) || 24, 60);
    const visibility = String(q.visibility ?? '').toLowerCase();
    const cursorMs = q.cursor ? Number(q.cursor) : NaN;

    let ref = db
      .collection('posts')
      .where('authorId', '==', profileUid)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (!Number.isNaN(cursorMs) && cursorMs > 0) {
      ref = ref.startAfter(admin.firestore.Timestamp.fromMillis(cursorMs));
    }

    const snap = await ref.get();
    let posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    const isOwner = viewer === profileUid;

    if (isOwner) {
      if (visibility === 'public') posts = posts.filter((p) => (p.visibility || 'public') === 'public');
      else if (visibility === 'private') posts = posts.filter((p) => (p.visibility || 'public') === 'private');
    } else {
      posts = posts.filter((p) => (p.visibility || 'public') === 'public');
    }

    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last?.get('createdAt')?.toMillis?.() ?? null;

    return res.json({ posts, nextCursor });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'list_failed', details: String(e?.message || e) });
  }
});

// Optionaler Alias für ältere Clients:
router.get('/by-me', (_req, res) => {
  res.redirect(307, '/posts/mine');
});

// ==== OWNERSHIP-HELPER
async function requireOwnPost(docId: string, uid: string) {
  const ref = db.collection('posts').doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  const data = snap.data() as any;
  if ((data.authorId || data.userId) !== uid) {
    throw Object.assign(new Error('forbidden'), { status: 403 });
  }
  return { ref, data };
}

/** PATCH /posts/:id  -> visibility/text ändern */
router.patch('/:id', async (req, res) => {
  try {
    const uid = getAuthUid(req);
    const { id } = req.params;

    const { ref } = await requireOwnPost(id, uid);

    const updates: any = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    const v = String(req.body?.visibility ?? '').toLowerCase();
    if (v === 'public' || v === 'private') updates.visibility = v;

    if (typeof req.body?.text === 'string') {
      updates.text = String(req.body.text).slice(0, 1200);
    }

    await ref.update(updates);
    return res.json({ ok: true, updates });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'update_failed', details: String(e?.message || e) });
  }
});

/** DELETE /posts/:id  -> Dokument + Storage löschen */
router.delete('/:id', async (req, res) => {
  try {
    const uid = getAuthUid(req);
    const { id } = req.params;

    const { ref, data } = await requireOwnPost(id, uid);

    try {
      const p = (data?.meta && (data.meta.path || data.meta.filePath)) || '';
      if (p && gcsBucket?.file) {
        await gcsBucket.file(p).delete({ ignoreNotFound: true });
      }
    } catch {
      /* ignore */
    }

    await ref.delete();
    return res.json({ ok: true });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'delete_failed', details: String(e?.message || e) });
  }
});

/**
 * GET /posts/media/signed?path=uploads/{uid}/...
 * Liefert 60s gültige SignURL (nur Owner dieses Pfades).
 */
router.get('/media/signed', async (req, res) => {
  try {
    const hdr = String(req.headers.authorization || '');
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    const pld: any = verifyToken(token);
    const uid = pld.userId || pld.uid || pld.id;

    const path = String(req.query.path || '');
    if (!path || !path.startsWith(`uploads/${uid}/`)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const file = gcsBucket.file(path);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 1000, // 60s
    });
    return res.json({ url });
  } catch (e: any) {
    const code = e?.status || 401;
    return res.status(code).json({ error: 'signed_url_failed', details: String(e?.message || e) });
  }
});

export default router;