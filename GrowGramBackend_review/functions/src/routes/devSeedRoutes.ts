// functions/src/routes/devSeedRoutes.ts
import { Router } from 'express';
import { admin, db } from '../config/firebase.js';

const router = Router();

// --- simple admin check via header ---
function assertAdmin(req: any) {
  const got = String(req.header('x-admin-task') || '');
  const want = String(process.env.ADMIN_TASK_TOKEN || '');
  if (!want || got !== want) {
    const err: any = new Error('forbidden');
    err.status = 403;
    throw err;
  }
}

// helper
function sortPair(a: string, b: string) {
  return [a, b].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
}

// =============== SEED USERS ===============
router.post('/seed-users', async (req, res) => {
  try {
    assertAdmin(req);

    const specs = [
      { email: 'alpha@growgram.dev',   password: 'Test1234!', username: 'alpha',   firstName: 'Alpha' },
      { email: 'beta@growgram.dev',    password: 'Test1234!', username: 'beta',    firstName: 'Beta' },
      { email: 'gamma@growgram.dev',   password: 'Test1234!', username: 'gamma',   firstName: 'Gamma' },
      { email: 'delta@growgram.dev',   password: 'Test1234!', username: 'delta',   firstName: 'Delta' },
      { email: 'epsilon@growgram.dev', password: 'Test1234!', username: 'epsilon', firstName: 'Epsilon' },
    ];

    const out: any[] = [];
    for (const s of specs) {
      // existiert schon?
      let user = null as any;
      try { user = await admin.auth().getUserByEmail(s.email); } catch {}
      if (!user) {
        user = await admin.auth().createUser({
          email: s.email, password: s.password, emailVerified: true, displayName: s.firstName,
        });
      }
      // Firestore user doc
      await db.collection('users').doc(user.uid).set({
        email: s.email,
        username: s.username,
        firstName: s.firstName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      out.push({ email: s.email, password: s.password, uid: user.uid, username: s.username });
    }

    return res.json({ ok: true, note: 'Nur für DEV nutzen – Credentials nie in Prod weitergeben.', users: out });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'seed_users_failed', details: String(e?.message || e) });
  }
});

// =============== SEED CHATS ===============
router.post('/seed-chats', async (req, res) => {
  try {
    assertAdmin(req);

    // Nutzer laden
    const wanted = ['alpha','beta','gamma','delta','epsilon'];
    const snap = await db.collection('users')
      .where('username', 'in', wanted.slice(0, 10)) // Firestore "in" max 10
      .get();

    const byUsername = new Map<string, { id: string; username: string }>();
    snap.forEach(d => {
      const u = d.data() as any;
      byUsername.set((u.username || '').toLowerCase(), { id: d.id, username: (u.username || '').toLowerCase() });
    });

    // Paare definieren
    const pairs: Array<[string, string, string[]]> = [
      ['alpha', 'beta',   ['Hey Beta ✌️', 'Was geht?']],
      ['alpha', 'gamma',  ['Moin Gamma!', 'Schon den neuen Grow gesehen?']],
      ['beta',  'gamma',  ['Yo', 'morgen Post?']],
      ['delta', 'epsilon',['Servus!', 'Alles grün 🌿']],
    ];

    const created: any[] = [];
    for (const [u1, u2, texts] of pairs) {
      const A = byUsername.get(u1);
      const B = byUsername.get(u2);
      if (!A || !B) continue;

      const members = sortPair(A.id, B.id);
      const memberHash = members.join('|');

      // existiert schon?
      const q = await db.collection('chats')
        .where('memberHash', '==', memberHash)
        .limit(1).get();

      let chatId = q.empty ? undefined : q.docs[0].id;

      if (!chatId) {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const ref = db.collection('chats').doc();
        await ref.set({
          members,
          memberHash,
          createdAt: now,
          updatedAt: now,
          lastMessage: null,
          lastSenderId: null,
          unread: { [A.id]: 0, [B.id]: 0 },
        });
        chatId = ref.id;
      }

      // Beispiel-Nachrichten (abwechselnd A/B)
      const thrRef = db.collection('chats').doc(chatId);
      let lastSender = A.id;
      let lastMessage = '';
      for (let i = 0; i < texts.length; i++) {
        const senderId = i % 2 === 0 ? A.id : B.id;
        lastSender = senderId;
        lastMessage = texts[i];
        await thrRef.collection('messages').add({
          senderId,
          text: texts[i],
          type: 'text',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          deleted: false,
        });
      }

      await thrRef.update({
        lastMessage,
        lastSenderId: lastSender,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      created.push({ chatId, u1, u2, messages: texts.length });
    }

    return res.json({ ok: true, created });
  } catch (e: any) {
    const code = e?.status || 500;
    return res.status(code).json({ error: 'seed_chats_failed', details: String(e?.message || e) });
  }
});

export default router;