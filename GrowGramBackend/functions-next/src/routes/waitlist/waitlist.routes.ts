import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authRequired } from '../../middleware/auth/auth.middleware.js';
import * as svc from '../../services/waitlist/waitlist.service.js';

/**
 * Beispiel-API:
 *  POST /waitlist/join { email }
 *  GET  /waitlist/count
 * Rate-Limit bitte in app beim Mount setzen oder hier als Middleware ergänzen.
 */
const r = Router();

r.post('/join', validate.body(
  // Minimaler Zod-Inline-Validator, um Abhängigkeit zu sparen
  (await import('zod')).z.object({ email: (await import('zod')).z.string().email() })
), async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await svc.join(email);
    res.status(201).json({ ok: true, ...result });
  } catch (e) { next(e); }
});

r.get('/count', authRequired, async (_req, res, next) => {
  try {
    const n = await svc.count();
    res.json({ ok: true, count: n });
  } catch (e) { next(e); }
});

export default r;