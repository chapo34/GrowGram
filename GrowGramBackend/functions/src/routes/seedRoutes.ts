// functions/src/routes/seedRoutes.ts
import { Router } from 'express';
import { db } from '../config/firebase.js';

const router = Router();

// Secret aus ENV oder DEV-Default
const SECRET = (process.env.SEED_SECRET || 'DEV_ONLY').trim();

function readKey(req: any): string | null {
  // Akzeptiere mehrere Varianten, damit cURL/Proxy-Fälle nicht scheitern
  const h1 = req.header('x-seed-secret');
  const h2 = req.header('x-seed-key');
  const q  = req.query?.key as string | undefined;
  return (h1 || h2 || q || '').trim() || null;
}

router.post('/seed/users', async (req, res) => {
  try {
    const provided = readKey(req);
    if (!provided || provided !== SECRET) {
      return res.status(401).json({ error: 'forbidden' });
    }

    const now = new Date().toISOString();
    const toCreate = [
      { id: `dev_alex`, firstName: 'Alex', lastName: 'Green',  username: 'alex',  email: 'alex+dev@example.com'  },
      { id: `dev_ben`,  firstName: 'Ben',  lastName: 'Leaf',   username: 'ben',   email: 'ben+dev@example.com'   },
      { id: `dev_cara`, firstName: 'Cara', lastName: 'Bud',    username: 'cara',  email: 'cara+dev@example.com'  },
    ];

    for (const u of toCreate) {
      const ref = db.collection(process.env.USERS_COLLECTION || 'users').doc(u.id);
      await ref.set({
        ...u,
        usernameLower: u.username.toLowerCase(),
        emailLower: u.email.toLowerCase(),
        privateProfile: false,
        hideSensitive: false,
        pushOptIn: true,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    return res.json({ ok: true, created: toCreate.map(u => u.id) });
  } catch (e: any) {
    return res.status(500).json({ error: 'seed_failed', details: String(e?.message || e) });
  }
});

export default router;