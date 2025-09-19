import type { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function likePost(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) return res.status(400).json({ message: 'missing_id' });

  try {
    await db.collection('posts').doc(id).update({
      likesCount: FieldValue.increment(1),
      updatedAt: new Date(),
    });
    return res.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('No document')) return res.status(404).json({ message: 'not_found' });
    return res.status(500).json({ message: 'like_failed', details: msg });
  }
}

export async function unlikePost(req: Request, res: Response) {
  const id = req.params.id;
  if (!id) return res.status(400).json({ message: 'missing_id' });

  try {
    await db.runTransaction(async (tx) => {
      const ref = db.collection('posts').doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('not_found');
      const cur = Number(snap.get('likesCount') ?? 0);
      tx.update(ref, {
        likesCount: Math.max(0, cur - 1),
        updatedAt: new Date(),
      });
    });
    return res.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === 'not_found') return res.status(404).json({ message: 'not_found' });
    return res.status(500).json({ message: 'unlike_failed', details: String(e?.message || e) });
  }
}