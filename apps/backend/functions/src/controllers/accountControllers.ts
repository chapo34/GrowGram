import type { Request, Response } from 'express';
import { verifyToken } from '../utils/jwtUtils.js';

// Admin modular & Firestore
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

/** Hilfsfunktion: UID aus Bearer-Token */
function getUidFromReq(req: Request): string | null {
  const hdr = String(req.headers.authorization || '');
  const tok = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!tok) return null;
  try {
    const p: any = verifyToken(tok);
    return p.userId || p.uid || p.id || null;
  } catch {
    return null;
  }
}

/**
 * DELETE /auth/account
 * Sofort: User-Dokument löschen & Posts soft-deleten.
 * Optional kannst du einen Cloud Task/Job für vollständige physische Löschung triggern.
 */
export async function deleteAccount(req: Request, res: Response) {
  try {
    const uid = getUidFromReq(req);
    if (!uid) return res.status(401).json({ ok: false, error: 'unauthorized' });

    // 1) User als „deleted“ markieren (Audit) & sofort löschen
    const uref = db.doc(`users/${uid}`);
    await uref.set(
      { deleted: true, deletedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    await uref.delete();

    // 2) Soft-Delete aller eigenen Posts (UI sofort sauber)
    const postsSnap = await db.collection('posts').where('authorId', '==', uid).limit(500).get();
    const batch = db.batch();
    postsSnap.forEach((d) => batch.update(d.ref, { deleted: true, visibility: 'private', updatedAt: FieldValue.serverTimestamp() }));
    await batch.commit();

    // (Optional) TODO: Storage-Dateien entfernen & Kommentare physisch löschen
    // => als Batch/Job lösen (Quota), damit der API-Call schnell bleibt.

    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[account] delete error:', e);
    return res.status(500).json({ ok: false, error: 'delete_failed' });
  }
}

/**
 * GET /auth/account/export
 * Liefert die wichtigsten personenbezogenen Daten aus Firestore.
 */
export async function exportAccount(req: Request, res: Response) {
  try {
    const uid = getUidFromReq(req);
    if (!uid) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const u = await db.doc(`users/${uid}`).get();
    const user = u.exists ? u.data() : null;

    // Nur Metadaten der Posts (nicht Binärdateien)
    const postsSnap = await db.collection('posts').where('authorId', '==', uid).limit(500).get();
    const posts = postsSnap.docs.map((d) => {
      const v = d.data() as any;
      return {
        id: d.id,
        text: v.text ?? '',
        mediaUrls: v.mediaUrls ?? [],
        tags: v.tags ?? [],
        visibility: v.visibility ?? 'public',
        likesCount: v.likesCount ?? 0,
        commentsCount: v.commentsCount ?? 0,
        createdAt: (v.createdAt instanceof Timestamp ? v.createdAt.toDate() : new Date(v.createdAt ?? Date.now())).toISOString(),
        updatedAt: (v.updatedAt instanceof Timestamp ? v.updatedAt.toDate() : new Date(v.updatedAt ?? Date.now())).toISOString(),
        deleted: !!v.deleted,
      };
    });

    return res.json({ ok: true, user, posts });
  } catch (e: any) {
    console.error('[account] export error:', e);
    return res.status(500).json({ ok: false, error: 'export_failed' });
  }
}