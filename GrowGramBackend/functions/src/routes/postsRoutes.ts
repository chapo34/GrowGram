// functions/src/routes/postsRoutes.ts
import { Router } from 'express';
import { db, admin } from '../config/firebase.js';

const router = Router();

/**
 * In diesem File bleiben Like/Unlike public (keine Auth-Pflicht),
 * Save/Unsave benötigen weiterhin einen User (x-user-id Header),
 * genau wie in deiner bisherigen Implementierung.
 */

function getUserId(req: any): string {
  // Produktions-Setup: aus JWT (req.user.uid o.ä.).
  // Für Tests erlauben wir weiterhin x-user-id.
  const h = String(req.headers['x-user-id'] || '').trim();
  return h || 'anon';
}

function ok(res: any, data: any = {}) {
  return res.json({ ok: true, ...data });
}

/* ===================== Post Likes ===================== */

router.post('/:postId/like', async (req, res) => {
  try {
    const postRef = db.collection('posts').doc(req.params.postId);
    let likesCount = 0;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(postRef);
      if (!snap.exists) throw new Error('post_not_found');
      const prev = Number(snap.get('likesCount') || 0);
      likesCount = prev + 1;
      tx.update(postRef, {
        likesCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return ok(res, { likesCount });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'post_like_failed', details: String(e.message || e) });
  }
});

router.post('/:postId/unlike', async (req, res) => {
  try {
    const postRef = db.collection('posts').doc(req.params.postId);
    let likesCount = 0;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(postRef);
      if (!snap.exists) throw new Error('post_not_found');
      const prev = Math.max(0, Number(snap.get('likesCount') || 0) - 1);
      likesCount = prev;
      tx.update(postRef, {
        likesCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return ok(res, { likesCount });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'post_unlike_failed', details: String(e.message || e) });
  }
});

/* ================= Post Save / Unsave (Bookmarks) ================= */

router.post('/:postId/save', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'anon') return res.status(401).json({ ok: false, message: 'auth_required' });

    const postRef = db.collection('posts').doc(req.params.postId);
    const saveRef = postRef.collection('saves').doc(uid);

    let saved = false,
      savesCount = 0;

    await db.runTransaction(async (tx) => {
      const [postSnap, saveSnap] = await Promise.all([tx.get(postRef), tx.get(saveRef)]);
      if (!postSnap.exists) throw new Error('post_not_found');

      if (!saveSnap.exists) {
        tx.set(saveRef, { userId: uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        const prev = Number(postSnap.get('savesCount') || 0);
        savesCount = prev + 1;
        tx.update(postRef, {
          savesCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        saved = true;
      } else {
        // idempotent
        saved = true;
        savesCount = Number(postSnap.get('savesCount') || 0);
      }
    });

    return ok(res, { saved, savesCount });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'post_save_failed', details: String(e.message || e) });
  }
});

router.post('/:postId/unsave', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'anon') return res.status(401).json({ ok: false, message: 'auth_required' });

    const postRef = db.collection('posts').doc(req.params.postId);
    const saveRef = postRef.collection('saves').doc(uid);

    let saved = false,
      savesCount = 0;

    await db.runTransaction(async (tx) => {
      const [postSnap, saveSnap] = await Promise.all([tx.get(postRef), tx.get(saveRef)]);
      if (!postSnap.exists) throw new Error('post_not_found');

      if (saveSnap.exists) {
        tx.delete(saveRef);
        const prev = Math.max(0, Number(postSnap.get('savesCount') || 0) - 1);
        savesCount = prev;
        tx.update(postRef, {
          savesCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        savesCount = Number(postSnap.get('savesCount') || 0);
      }
    });

    return ok(res, { saved, savesCount });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'post_unsave_failed', details: String(e.message || e) });
  }
});

/* ======================= Kommentare ======================= */

router.get('/:postId/comments', async (req, res) => {
  try {
    const postId = req.params.postId;
    const snap = await db
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return ok(res, { comments });
  } catch (e: any) {
    return res.status(400).json({
      ok: false,
      message: 'comments_fetch_failed',
      details: String(e.message || e),
    });
  }
});

router.post('/:postId/comments', async (req, res) => {
  try {
    const postId = req.params.postId;
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, message: 'text_required' });

    const now = admin.firestore.FieldValue.serverTimestamp();
    const postRef = db.collection('posts').doc(postId);
    const cRef = postRef.collection('comments').doc();

    const comment = {
      id: cRef.id,
      postId,
      text,
      author: { name: 'Du' }, // später aus Auth übernehmen
      likesCount: 0,
      liked: false,
      createdAt: new Date().toISOString(), // Clientfreundlich
      _serverCreatedAt: now, // server truth
    };

    await db.runTransaction(async (tx) => {
      tx.set(cRef, comment);
      const p = await tx.get(postRef);
      if (!p.exists) throw new Error('post_not_found');
      const nextCount = Number(p.get('commentsCount') || 0) + 1;
      tx.update(postRef, { commentsCount: nextCount, updatedAt: now });
    });

    return ok(res, { comment });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'comment_add_failed', details: String(e.message || e) });
  }
});

/* =============== Kommentar-Likes =============== */

router.post('/:postId/comments/:commentId/like', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const cRef = db.collection('posts').doc(postId).collection('comments').doc(commentId);

    let likesCount = 0;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(cRef);
      if (!snap.exists) throw new Error('comment_not_found');
      likesCount = Number(snap.get('likesCount') || 0) + 1;
      tx.update(cRef, { likesCount });
    });

    return ok(res, { likesCount });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'comment_like_failed', details: String(e.message || e) });
  }
});

router.post('/:postId/comments/:commentId/unlike', async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const cRef = db.collection('posts').doc(postId).collection('comments').doc(commentId);

    let likesCount = 0;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(cRef);
      if (!snap.exists) throw new Error('comment_not_found');
      likesCount = Math.max(0, Number(snap.get('likesCount') || 0) - 1);
      tx.update(cRef, { likesCount });
    });

    return ok(res, { likesCount });
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'comment_unlike_failed', details: String(e.message || e) });
  }
});

/* ===== Optionale negative Signal-Route (Hide) ===== */

router.post('/:postId/hide', async (req, res) => {
  try {
    const ref = db.collection('posts').doc(req.params.postId);
    await ref.update({
      negativeSignals: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return ok(res);
  } catch (e: any) {
    return res
      .status(400)
      .json({ ok: false, message: 'hide_signal_failed', details: String(e.message || e) });
  }
});

export default router;