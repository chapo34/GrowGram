// functions/src/routes/chatRoutes.ts
import { Router } from 'express';
import { admin, db } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';

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
  // Firestore Timestamp oder millis/ISO akzeptieren
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

/* ----------------------------- routes ----------------------------- */

/**
 * POST /chat/open   (Alias für /chat/start)
 * Body: { peerId: string }
 * Liefert existierenden Thread oder erstellt einen neuen.
 */
router.post('/open', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const peer = String(req.body?.peerId || '');
    if (!peer || peer === me) return res.status(400).json({ error: 'bad_peer' });

    const members = sortPair(me, peer);
    const memberHash = members.join('|');

    // existierenden Thread rein über memberHash finden (kein extra Index nötig)
    const q = await db.collection('chats')
      .where('memberHash', '==', memberHash)
      .limit(1)
      .get();

    if (!q.empty) {
      const d = q.docs[0];
      return res.json({ ok: true, chat: { id: d.id, ...(d.data() as any) } });
    }

    // neu anlegen
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = db.collection('chats').doc();
    await ref.set({
      members,
      memberHash,
      createdAt: now,
      updatedAt: now,
      lastMessage: null,
      lastSenderId: null,
      unread: { [me]: 0, [peer]: 0 },
    });

    return res.status(201).json({ ok: true, chat: { id: ref.id, members } });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'open_failed', details: String(e?.message || e) });
  }
});

/**
 * GET /chat/list?limit=&cursor=
 * Liefert Threads des eingeloggten Users (inkl. peer-Minidaten).
 * cursor = updatedAtMillis (absteigend)
 */
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

    // Peer-Infos anreichern
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
    // Fallback, wenn Index noch baut
    const msg = String(e?.message || '');
    if (msg.includes('FAILED_PRECONDITION') || msg.includes('requires an index')) {
      const snap = await db.collection('chats')
        .where('members', 'array-contains', uid)
        .limit(limit)
        .get();

      let chats = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      chats.sort((a, b) => (millisOf(b.updatedAt) ?? 0) - (millisOf(a.updatedAt) ?? 0));

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

/**
 * GET /chat/:id/messages?limit=&cursor=
 * cursor = createdAtMillis (untere Pagination, absteigend)
 */
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

/**
 * POST /chat/:id/messages
 * Body: { text: string }
 */
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

    // unread für andere +1, für mich 0
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

/**
 * POST /chat/:id/read
 * Body: {}
 * → setzt unread[me] = 0
 */
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

/**
 * GET /chat/users/search?q=&limit=
 * Einfache Nutzersuche für das Chat-Suchmodal.
 * Erwartete Felder im User-Dokument: usernameLower, emailLower, username, firstName, lastName, email, avatarUrl
 */
router.get('/users/search', async (req, res) => {
  try {
    const me = getAuthUid(req);
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 50);

    if (!q) return res.json({ users: [] });

    // 1) Username-Prefix
    const qsnap = await db.collection(USERS_COLLECTION)
      .where('usernameLower', '>=', q)
      .where('usernameLower', '<=', q + '\uf8ff')
      .limit(limit)
      .get();

    let users = qsnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    // 2) Falls keine Treffer & q sieht wie Email aus → exact per emailLower
    if (users.length === 0 && q.includes('@')) {
      const esnap = await db.collection(USERS_COLLECTION)
        .where('emailLower', '==', q)
        .limit(1)
        .get();
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

/* --------------------------------------------------------------------
 * HINWEIS: Firestore-Index (einmalig deployen), damit /chat/list schnell ist:
 *
 * {
 *   "indexes": [
 *     {
 *       "collectionGroup": "chats",
 *       "queryScope": "COLLECTION",
 *       "fields": [
 *         { "fieldPath": "members",   "arrayConfig": "CONTAINS" },
 *         { "fieldPath": "updatedAt", "order": "DESCENDING" }
 *       ]
 *     }
 *   ],
 *   "fieldOverrides": []
 * }
 *
 * Danach: firebase deploy --only firestore:indexes
 * -------------------------------------------------------------------*/