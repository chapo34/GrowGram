import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../utils/jwtUtils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersCollection = db.collection('users');

const sendHtml = (
  res: Response,
  file: 'verify-success.html' | 'verify-already.html' | 'verify-error.html'
) => {
  // immer dist/public nehmen, weil Firebase Functions kompiliert
  return res.sendFile(path.join(__dirname, '..', 'public', file));
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // Token entweder aus Query oder aus Route-Param holen
    const token = typeof req.query.token === 'string'
      ? req.query.token
      : typeof req.params.token === 'string'
        ? req.params.token
        : null;

    if (!token) {
      return sendHtml(res, 'verify-error.html');
    }

    const payload = verifyToken(token) as any;
    if (!payload || typeof payload === 'string' || !payload.userId) {
      return sendHtml(res, 'verify-error.html');
    }

    const userRef = usersCollection.doc(payload.userId);
    const snap = await userRef.get();
    if (!snap.exists) {
      return sendHtml(res, 'verify-error.html');
    }

    const user = snap.data() || {};
    if (user.isVerified) {
      return sendHtml(res, 'verify-already.html');
    }

    await userRef.update({ isVerified: true });
    return sendHtml(res, 'verify-success.html');
  } catch (err) {
    console.error('[verify] error', err);
    return sendHtml(res, 'verify-error.html');
  }
};