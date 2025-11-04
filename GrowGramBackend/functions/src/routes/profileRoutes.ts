// functions/src/routes/profileRoutes.ts
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { admin, db, bucket as exportedBucket } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

const router = Router();

/* ------------ Helpers ------------ */

const bucket =
  exportedBucket ??
  (global as any).__gg_bucket ??
  ((admin as any).storage && (admin as any).storage().bucket());
(global as any).__gg_bucket = bucket;

function getUid(req: any): string {
  const hdr = String(req.headers.authorization || '');
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const p: any = verifyToken(token);
  const uid = p.userId || p.uid || p.id;
  if (!uid) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return uid;
}

async function readBuffer(req: any): Promise<Buffer> {
  const raw = (req as any).rawBody;
  if (raw) return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

function sanitizeName(s: string) {
  return String(s || '').trim().replace(/[^\w.\-]+/g, '_') || 'file';
}

function pickProfilePatch(src: any) {
  const out: any = {};
  const put = (k: string, v: any, max = 80) => {
    if (v == null) return;
    if (typeof v === 'string') {
      const s = v.trim();
      out[k] = s ? s.slice(0, max) : '';
    } else out[k] = v;
  };
  put('firstName', src.firstName);
  put('lastName', src.lastName);
  put('username', src.username?.toLowerCase());
  put('city', src.city);
  put('bio', src.bio, 200);
  put('avatarUrl', src.avatarUrl, 500);
  out.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  return out;
}

async function readUser(uid: string) {
  const snap = await db.collection('users').doc(uid).get();
  const d = snap.data() || {};
  return {
    id: uid,
    firstName: d.firstName || '',
    lastName: d.lastName || '',
    email: d.email || '',
    username: d.username || '',
    city: d.city || '',
    birthDate: d.birthDate || '',
    bio: d.bio || '',
    avatarUrl: d.avatarUrl || '',
  };
}

/* ------------ Routes ------------ */

// GET /me    (auch unter /auth gemountet)
router.get('/me', async (req, res): Promise<void> => {
  try {
    const uid = getUid(req);
    const user = await readUser(uid);
    res.json(user);
  } catch (e: any) {
    res.status(e?.status || 500).json({ error: 'me_failed', details: String(e?.message || e) });
  }
});

// PATCH /me  – Profilfelder speichern
router.patch('/me', async (req, res): Promise<void> => {
  try {
    const uid = getUid(req);
    const patch = pickProfilePatch(req.body || {});
    await db.collection('users').doc(uid).set(patch, { merge: true });
    const user = await readUser(uid);
    res.json(user);
  } catch (e: any) {
    res.status(e?.status || 500).json({ error: 'update_failed', details: String(e?.message || e) });
  }
});

// POST /me/avatar-binary    (Body: image/*)
router.post('/me/avatar-binary', async (req, res): Promise<void> => {
  try {
    const uid = getUid(req);
    if (!bucket || !bucket.name) {
      res.status(500).json({ error: 'storage_not_configured' });
      return;
    }

    const buf = await readBuffer(req);
    if (!buf?.length) {
      res.status(400).json({ error: 'empty_body' });
      return;
    }

    const mime = req.header('content-type') || 'application/octet-stream';
    const filename = sanitizeName((req.query as any)?.filename || 'avatar.jpg');
    const ts = Date.now();
    const destPath = `avatars/${uid}/${ts}_${filename}`;
    const dlToken = uuidv4();

    await bucket.file(destPath).save(buf, {
      resumable: false,
      metadata: {
        contentType: mime,
        metadata: { firebaseStorageDownloadTokens: dlToken, uploadedBy: uid },
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });

    const url =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
      `${encodeURIComponent(destPath)}?alt=media&token=${dlToken}`;

    await db.collection('users').doc(uid).set(
      { avatarUrl: url, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    res.status(201).json({ ok: true, url });
  } catch (e: any) {
    res.status(e?.status || 500).json({ error: 'avatar_failed', details: String(e?.message || e) });
  }
});

// Alias für ältere Clients: POST /avatar-binary  -> /me/avatar-binary
router.post('/avatar-binary', (req, _res, next) => {
  (req as any).url = '/me/avatar-binary';
  next();
});

export default router;