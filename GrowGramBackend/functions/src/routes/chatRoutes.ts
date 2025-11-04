// functions/src/routes/chatRoutes.ts
import { Router } from 'express';
import { admin, db, bucket } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';
import Busboy from 'busboy';
import { randomUUID } from 'node:crypto';

const router = Router();
const USERS_COLLECTION = process.env.USERS_COLLECTION || 'users';

/* ----------------------------- helpers ----------------------------- */

function getAuthUid(req: any): string {
  const hdr = String(req.headers.authorization || '');
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const p: any = verifyToken(token);
  const uid = p.userId || p.uid || p.id;
  if (!uid) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return uid;
}

function sortPair(a: string, b: string) {
  return [a, b].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
}

function millisOf(ts: any): number | null {
  if (!ts) return null;
  try {
    if (typeof ts?.toMillis === 'function') return ts.toMillis();
    if (typeof ts === 'number') return ts;
    const t = new Date(String(ts)).getTime();
    return Number.isFinite(t) ? t : null;
  } catch { return null; }
}

async function loadUserMini(uid: string) {
  try {
    const snap = await db.collection(USERS_COLLECTION).doc(uid).get();
    if (!snap.exists) return { id: uid };
    const u = snap.data() as any;
    return {
      id: uid,
      username: u?.username || '',
      firstName: u?.firstName || '',
      lastName: u?.lastName || '',
      email: u?.email || '',
      avatarUrl: u?.avatarUrl || '',
    };
  } catch {
    return { id: uid };
  }
}

function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('heic')) return 'heic';
  if (m.includes('webp')) return 'webp';
  if (m.includes('m4a')) return 'm4a';
  if (m.includes('aac')) return 'aac';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp3')) return 'mp3';
  return 'bin';
}

function makeDownloadUrl(objectPath: string, token: string) {
  const b = bucket.name;
  const enc = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${b}/o/${enc}?alt=media&token=${token}`;
}

async function assertMembership(chatId: string, uid: string) {
  const ref = db.collection('chats').doc(chatId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('not_found'), { status: 404 });
  const data = snap.data() as any;
  if (!data.members?.includes(uid)) throw Object.assign(new Error('forbidden'), { status: 403 });
  return { ref, data };
}

/* ----------------------------- routes ----------------------------- */

/** POST /chat/open */
router.post('/open', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const peer = String(req.body?.peerId || '');
    if (!peer || peer === me) return res.status(400).json({ error: 'bad_peer' });

    const members = sortPair(me, peer);
    const memberHash = members.join('|');

    const q = await db.collection('chats')
      .where('memberHash', '==', memberHash)
      .limit(1).get();

    if (!q.empty) {
      const d = q.docs[0];
      return res.json({ ok: true, chat: { id: d.id, ...(d.data() as any) } });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = db.collection('chats').doc();
    await ref.set({
      members, memberHash,
      createdAt: now, updatedAt: now,
      lastMessage: null, lastSenderId: null,
      unread: { [me]: 0, [peer]: 0 },
    });

    return res.status(201).json({ ok: true, chat: { id: ref.id, members } });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'open_failed', details: String(e?.message || e) });
  }
});

/** GET /chat/list */
router.get('/list', async (req, res) => {
  const uid = getAuthUid(req);
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 50);
  const cursorMs = req.query.cursor ? Number(req.query.cursor) : NaN;

  try {
    let ref = db.collection('chats')
      .where('members', 'array-contains', uid)
      .orderBy('updatedAt', 'desc')
      .limit(limit);

    if (!Number.isNaN(cursorMs) && cursorMs > 0) {
      ref = ref.startAfter(admin.firestore.Timestamp.fromMillis(cursorMs));
    }

    const snap = await ref.get();
    let chats = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    // eigene Deletions filtern
    chats = chats.filter(c => !(c?.deletedFor && c.deletedFor[uid]));

    chats = await Promise.all(chats.map(async c => {
      const others = (c.members || []).filter((m: string) => m !== uid);
      const peerId = others[0] || '';
      const peer = peerId ? await loadUserMini(peerId) : undefined;
      return { ...c, peer };
    }));

    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last?.get('updatedAt')?.toMillis?.() ?? null;

    return res.json({ ok: true, chats, nextCursor });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('FAILED_PRECONDITION') || msg.includes('requires an index')) {
      // Fallback ohne OrderBy
      const snap = await db.collection('chats')
        .where('members', 'array-contains', uid)
        .limit(limit).get();

      let chats = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      chats.sort((a, b) => (millisOf(b.updatedAt) ?? 0) - (millisOf(a.updatedAt) ?? 0));
      chats = chats.filter(c => !(c?.deletedFor && c.deletedFor[uid]));

      chats = await Promise.all(chats.map(async c => {
        const others = (c.members || []).filter((m: string) => m !== uid);
        const peerId = others[0] || '';
        const peer = peerId ? await loadUserMini(peerId) : undefined;
        return { ...c, peer };
      }));

      const nextCursor = chats.length ? millisOf(chats[chats.length - 1].updatedAt) : null;
      return res.json({ ok: true, chats, nextCursor, degraded: true });
    }
    const code = e?.status || 500;
    return res.status(code).json({ error: 'list_failed', details: String(e?.message || e) });
  }
});

/** GET /chat/:id/messages */
router.get('/:id/messages', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;
    const thr = await db.collection('chats').doc(id).get();
    if (!thr.exists) return res.status(404).json({ error: 'not_found' });
    const data = thr.data() as any;
    if (!data.members?.includes(me)) return res.status(403).json({ error: 'forbidden' });

    const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 100);
    const cursorMs = req.query.cursor ? Number(req.query.cursor) : NaN;

    let ref = db.collection('chats').doc(id).collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (!Number.isNaN(cursorMs) && cursorMs > 0) {
      ref = ref.startAfter(admin.firestore.Timestamp.fromMillis(cursorMs));
    }

    const snap = await ref.get();
    const messages = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last?.get('createdAt')?.toMillis?.() ?? null;

    return res.json({ ok: true, messages, nextCursor });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'messages_failed', details: String(e?.message || e) });
  }
});

/** POST /chat/:id/messages (Text) */
router.post('/:id/messages', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;

    const text = String(req.body?.text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: 'text_required' });

    const thrRef = db.collection('chats').doc(id);
    const thr = await thrRef.get();
    if (!thr.exists) return res.status(404).json({ error: 'not_found' });
    const data = thr.data() as any;
    if (!data.members?.includes(me)) return res.status(403).json({ error: 'forbidden' });

    const now = admin.firestore.FieldValue.serverTimestamp();
    const msgRef = thrRef.collection('messages').doc();
    await msgRef.set({
      type: 'text',
      senderId: me,
      text,
      createdAt: now,
      deleted: false,
    });

    const unread = { ...(data.unread || {}) };
    for (const m of (data.members as string[])) {
      unread[m] = m === me ? 0 : Math.max(0, Number(unread[m] || 0)) + 1;
    }

    await thrRef.update({
      lastMessage: text,
      lastSenderId: me,
      updatedAt: now,
      unread,
    });

    return res.status(201).json({ ok: true, id: msgRef.id });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'send_failed', details: String(e?.message || e) });
  }
});

/** POST /chat/:id/attachments  (multipart: file + fields[type=image|audio], durationMs?) */
router.post('/:id/attachments', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;
    const { ref: thrRef, data: thrData } = await assertMembership(id, me);

    const bb = Busboy({ headers: req.headers as any });

    let fileBuffer: Buffer | null = null;
    let fileName = 'upload.bin';
    let fileMime = 'application/octet-stream';
    let declaredType: 'image' | 'audio' = 'image';
    let durationMs: number | undefined;

    let finished = false;

    bb.on('file', (_field, file, info) => {
      fileName = info.filename || fileName;
      fileMime = info.mimeType || fileMime;
      const chunks: Buffer[] = [];
      file.on('data', d => chunks.push(Buffer.from(d)));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('field', (name, val) => {
      if (name === 'type') {
        const v = String(val).toLowerCase();
        declaredType = v.startsWith('audio') ? 'audio' : 'image';
      }
      if (name === 'durationMs') {
        const n = Number(val);
        if (Number.isFinite(n) && n >= 0) durationMs = n;
      }
    });

    bb.on('finish', async () => {
      finished = true;
      if (!fileBuffer) return res.status(400).json({ error: 'file_required' });

      const ext = extForMime(fileMime);
      const objectPath = `chat/${id}/${Date.now()}_${randomUUID()}.${ext}`;
      const token = randomUUID();

      await bucket.file(objectPath).save(fileBuffer as Buffer, {
        contentType: fileMime,
        metadata: {
          metadata: {
            chatId: id,
            uploader: me,
            type: declaredType,
            visibility: 'private',
            firebaseStorageDownloadTokens: token,
          } as any,
        },
      });

      const mediaUrl = makeDownloadUrl(objectPath, token);
      const now = admin.firestore.FieldValue.serverTimestamp();
      const msgRef = thrRef.collection('messages').doc();

      const text = declaredType === 'image' ? '📷 Foto' : '🎤 Sprachmemo';
      await msgRef.set({
        type: declaredType,
        senderId: me,
        text,
        mediaUrl,
        durationMs: declaredType === 'audio' ? (durationMs ?? null) : null,
        createdAt: now,
        deleted: false,
      });

      // unread zählen
      const unread = { ...(thrData.unread || {}) };
      for (const m of (thrData.members as string[])) {
        unread[m] = m === me ? 0 : Math.max(0, Number(unread[m] || 0)) + 1;
      }

      await thrRef.update({
        lastMessage: text,
        lastSenderId: me,
        updatedAt: now,
        unread,
      });

      return res.status(201).json({
        ok: true,
        message: { id: msgRef.id, type: declaredType, senderId: me, mediaUrl, durationMs: durationMs ?? null },
      });
    });

    // In Cloud Functions ist rawBody verfügbar
    bb.end((req as any).rawBody);

    // Safety: Timeout falls Busboy nicht finish triggert
    setTimeout(() => {
      if (!finished && !res.headersSent) {
        res.status(400).json({ error: 'busboy_timeout' });
      }
    }, 10000);

    return;
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'attach_failed', details: String(e?.message || e) });
  }
});

// Alias: /chat/:id/media → identisch zu /attachments
router.post('/:id/media', (req, _unused, next) => {
  (req.url = req.url.replace('/media', '/attachments')), next();
});

/** POST /chat/:id/typing { typing: boolean } */
router.post('/:id/typing', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;
    const typing = !!req.body?.typing;

    await db.collection('chats').doc(id).update({
      ['typing.' + me]: typing
        ? admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'typing_failed', details: String(e?.message || e) });
  }
});

/** POST /chat/:id/read */
router.post('/:id/read', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;

    const thrRef = db.collection('chats').doc(id);
    const thr = await thrRef.get();
    if (!thr.exists) return res.status(404).json({ error: 'not_found' });
    const data = thr.data() as any;
    if (!data.members?.includes(me)) return res.status(403).json({ error: 'forbidden' });

    const unread = { ...(data.unread || {}) };
    unread[me] = 0;

    await thrRef.update({
      unread,
      ['lastRead.' + me]: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'read_failed', details: String(e?.message || e) });
  }
});

/** Actions: mute / archive / unarchive / delete */
router.post('/:id/mute', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;
    const { ref, data } = await assertMembership(id, me);
    const muted = { ...(data.muted || {}) };
    muted[me] = !!req.body?.mute;
    await ref.update({ muted });
    res.json({ ok: true, muted: !!muted[me] });
  } catch (e: any) {
    const code = e?.status || 500;
    res.status(code).json({ error: 'mute_failed', details: String(e?.message || e) });
  }
});

router.post('/:id/archive', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;
    const { ref, data } = await assertMembership(id, me);
    const archived = { ...(data.archived || {}) };
    archived[me] = true;
    await ref.update({ archived });
    res.json({ ok: true });
  } catch (e: any) {
    const code = e?.status || 500;
    res.status(code).json({ error: 'archive_failed', details: String(e?.message || e) });
  }
});

router.post('/:id/unarchive', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;
    const { ref, data } = await assertMembership(id, me);
    const archived = { ...(data.archived || {}) };
    delete archived[me];
    await ref.update({ archived });
    res.json({ ok: true });
  } catch (e: any) {
    const code = e?.status || 500;
    res.status(code).json({ error: 'unarchive_failed', details: String(e?.message || e) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const { id } = req.params;
    const { ref, data } = await assertMembership(id, me);
    const deletedFor = { ...(data.deletedFor || {}) };
    deletedFor[me] = true;
    await ref.update({ deletedFor });
    res.json({ ok: true });
  } catch (e: any) {
    const code = e?.status || 500;
    res.status(code).json({ error: 'delete_failed', details: String(e?.message || e) });
  }
});

/** GET /chat/users/search */
router.get('/users/search', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 50);

    if (!q) return res.json({ users: [] });

    const qsnap = await db.collection(USERS_COLLECTION)
      .where('usernameLower', '>=', q)
      .where('usernameLower', '<=', q + '\uf8ff')
      .limit(limit).get();

    let users = qsnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    if (users.length === 0 && q.includes('@')) {
      const esnap = await db.collection(USERS_COLLECTION)
        .where('emailLower', '==', q)
        .limit(1).get();
      users = esnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    }

    const out = users
      .filter(u => u.id !== me)
      .map(u => ({
        id: u.id,
        username: u.username || '',
        firstName: u.firstName || '',
        lastName:  u.lastName  || '',
        email:     u.email     || '',
        avatarUrl: u.avatarUrl || '',
      }));

    return res.json({ users: out });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'user_search_failed', details: String(e?.message || e) });
  }
});

export default router;