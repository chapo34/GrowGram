// functions/src/controllers/postsController.ts
import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { db } from '../config/firebase.js';

const { FieldValue, Timestamp } = admin.firestore;

// ---------- Helpers ----------
function toISO(v: any): string {
  try {
    if (!v) return new Date().toISOString();
    if (v instanceof Timestamp) return v.toDate().toISOString();
    if (typeof v?.toDate === 'function') return v.toDate().toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function mapComment(d: any) {
  const data = d.data() || {};
  return {
    id: d.id,
    postId: String(data.postId || ''),
    text: String(data.text || ''),
    author: data.author || { name: 'User' },
    likesCount: Number(data.likesCount || 0),
    createdAt: toISO(data.createdAt),
  };
}

// ---------- Post Likes ----------
export async function likePost(req: Request, res: Response) {
  const postId = req.params.postId;
  if (!postId) return res.status(400).json({ message: 'postId required' });

  const ref = db.collection('posts').doc(postId);
  try {
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('not_found');
      const cur = Number(snap.get('likesCount') || 0);
      const val = cur + 1;
      // race-safe: entweder increment oder explizit setzen
      tx.update(ref, { likesCount: FieldValue.increment(1) });
      return val;
    });
    return res.json({ ok: true, likesCount: next });
  } catch (e: any) {
    const code = e?.message === 'not_found' ? 404 : 500;
    return res.status(code).json({ message: 'like_failed', details: String(e?.message || e) });
  }
}

export async function unlikePost(req: Request, res: Response) {
  const postId = req.params.postId;
  if (!postId) return res.status(400).json({ message: 'postId required' });

  const ref = db.collection('posts').doc(postId);
  try {
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('not_found');
      const cur = Number(snap.get('likesCount') || 0);
      const val = Math.max(0, cur - 1);
      // hier explizit setzen, damit kein Negativwert entsteht
      tx.update(ref, { likesCount: val });
      return val;
    });
    return res.json({ ok: true, likesCount: next });
  } catch (e: any) {
    const code = e?.message === 'not_found' ? 404 : 500;
    return res.status(code).json({ message: 'unlike_failed', details: String(e?.message || e) });
  }
}

// ---------- Comments ----------
export async function listComments(req: Request, res: Response) {
  const postId = req.params.postId;
  if (!postId) return res.status(400).json({ message: 'postId required' });

  try {
    const snap = await db
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const comments = snap.docs.map(mapComment);
    return res.json({ comments });
  } catch (e: any) {
    return res.status(500).json({ message: 'comments_list_failed', details: String(e?.message || e) });
  }
}

export async function addComment(req: Request, res: Response) {
  const postId = req.params.postId;
  const text = String(req.body?.text || '').trim();
  if (!postId || !text) return res.status(400).json({ message: 'postId & text required' });

  const postRef = db.collection('posts').doc(postId);
  const commentsRef = postRef.collection('comments');

  try {
    // 1) Transaktion: anlegen + Zähler hoch
    const docId = await db.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) throw new Error('not_found');

      const docRef = commentsRef.doc();
      tx.set(docRef, {
        postId,
        text,
        author: { name: 'User' }, // TODO: später aus Auth füllen
        likesCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(postRef, { commentsCount: FieldValue.increment(1) });

      return docRef.id;
    });

    // 2) frisch gespeicherten Kommentar lesen (damit createdAt aufgelöst ist)
    const saved = await commentsRef.doc(docId).get();
    const comment = mapComment(saved);
    return res.status(201).json({ ok: true, comment });
  } catch (e: any) {
    const code = e?.message === 'not_found' ? 404 : 500;
    return res.status(code).json({ message: 'comment_add_failed', details: String(e?.message || e) });
  }
}

// ---------- Comment Likes ----------
export async function likeComment(req: Request, res: Response) {
  const { postId, commentId } = req.params as { postId: string; commentId: string };
  if (!postId || !commentId) return res.status(400).json({ message: 'postId & commentId required' });

  const cref = db.collection('posts').doc(postId).collection('comments').doc(commentId);
  try {
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(cref);
      if (!snap.exists) throw new Error('not_found');
      const cur = Number(snap.get('likesCount') || 0);
      const val = cur + 1;
      tx.update(cref, { likesCount: FieldValue.increment(1) });
      return val;
    });
    return res.json({ ok: true, likesCount: next });
  } catch (e: any) {
    const code = e?.message === 'not_found' ? 404 : 500;
    return res.status(code).json({ message: 'comment_like_failed', details: String(e?.message || e) });
  }
}

export async function unlikeComment(req: Request, res: Response) {
  const { postId, commentId } = req.params as { postId: string; commentId: string };
  if (!postId || !commentId) return res.status(400).json({ message: 'postId & commentId required' });

  const cref = db.collection('posts').doc(postId).collection('comments').doc(commentId);
  try {
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(cref);
      if (!snap.exists) throw new Error('not_found');
      const cur = Number(snap.get('likesCount') || 0);
      const val = Math.max(0, cur - 1);
      tx.update(cref, { likesCount: val });
      return val;
    });
    return res.json({ ok: true, likesCount: next });
  } catch (e: any) {
    const code = e?.message === 'not_found' ? 404 : 500;
    return res.status(code).json({ message: 'comment_unlike_failed', details: String(e?.message || e) });
  }
}