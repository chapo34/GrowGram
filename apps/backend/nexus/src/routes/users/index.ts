// src/routes/users/index.ts
import { Router } from 'express';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import profile from './profile.routes.js';
import avatar from './avatar.routes.js';

const r = Router();

/** Leichte Identität zurückgeben (JWT) – passt zu unserer Auth-Middleware */
r.get('/me', authRequired, (req, res) => {
  // falls du bereits auf req.authUser umgestellt hast → die erste Zeile reicht
  const u: any = (req as any).authUser || (req as any).user;
  if (!u?.id && !u?.userId) return res.status(401).json({ error: 'unauthorized' });

  res.json({
    user: {
      id: u.userId || u.id,
      email: u.email,
      role: u.role || 'user',
    },
  });
});

/** Subrouter:
 *  - Wenn ALLES geschützt sein soll → r.use(authRequired, profile/avatar);
 *  - Wenn einzelne Routen öffentlich sind → so lassen und im Subrouter absichern.
 */
r.use(profile);
r.use(avatar);

export default r;