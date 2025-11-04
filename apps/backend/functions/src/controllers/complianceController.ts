import type { Request, Response } from 'express';
import { db, admin } from '../config/firebase.js';

export const complianceAck = async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.userId; // aus authMiddleware gesetzt
    if (!uid) return res.status(401).json({ message: 'Nicht autorisiert' });

    const { agree, over18, version } = (req.body || {}) as {
      agree?: boolean; over18?: boolean; version?: string;
    };

    if (!agree || !over18) {
      return res.status(400).json({ message: 'Zustimmung erforderlich' });
    }

    const ver = version || '1.0.0';
    const userRef = db.collection('users').doc(uid);

    await userRef.set({
      compliance: {
        agreed: true,
        over18: true,
        latestVersion: ver,
        acknowledgements: admin.firestore.FieldValue.arrayUnion({
          version: ver,
          at: admin.firestore.FieldValue.serverTimestamp(),
        }),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ ok: true });
  } catch (e) {
    console.error('[complianceAck] error:', e);
    return res.status(500).json({ message: 'Interner Serverfehler' });
  }
};