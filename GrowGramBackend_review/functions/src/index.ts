// functions/src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import * as functions from 'firebase-functions/v1';
import express from 'express';
import type { CorsOptions } from 'cors';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// ---- Routes
import taxonomyRoutes from './routes/taxonomy.js';
import authRoutes from './routes/authRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import searchRoutes from './routes/search.js';
import postUploadRoutes from './routes/postUploadRoutes.js';
import avatarRoutes from './routes/avatarRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import seedRoutes from './routes/seedRoutes.js'; // 👈 zum schnellen Anlegen von Test-Usern
import devSeedRoutes from './routes/devSeedRoutes.js';
import { verifyEmail } from './controllers/verifyController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- CORS / Origins
const cfg: any = (functions as any).config ? (functions as any).config() : {};
const PROD_ORIGIN: string = cfg?.app?.baseurl || process.env.APP_BASEURL || '';

const ORIGINS: string[] = [
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:19000',
  'http://127.0.0.1:19000',
  PROD_ORIGIN,
].filter((o): o is string => !!o && typeof o === 'string');
const allowedOrigins = new Set<string>(ORIGINS);

// ---- App
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ---- Security: Headers + Rate Limits
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // RN Images
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
}));

// global moderates Limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// feinere Limits
const authLimiter   = rateLimit({ windowMs: 10 * 60 * 1000, max: 200 });
const uploadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 120 });

// ---- CORS
const corsOptions: CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};
app.use(cors(corsOptions));

// Preflight
app.options('*', (req, res) => {
  const origin = req.get('Origin') || '';
  if (!origin || allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    return res.status(204).end();
  }
  return res.status(403).end();
});

// Parser + static
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- ROUTES (Reihenfolge wichtig!) ---------- */

// Auth (+ Verify)
app.use('/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.get('/auth/verify-email', verifyEmail);
app.get('/api/auth/verify-email', verifyEmail);

// Avatar-Upload unter /auth (Client verwendet /auth/avatar-binary)
app.use('/auth', avatarRoutes);      // → POST /auth/avatar-binary
app.use('/api/auth', avatarRoutes);  // → POST /api/auth/avatar-binary

// Profile-/Me-Routen (Alias unter /auth, damit /auth/me funktioniert)
app.use('/users', profileRoutes);
app.use('/api/users', profileRoutes);
app.use('/auth', profileRoutes);      // → /auth/me, /auth/me/avatar-binary
app.use('/api/auth', profileRoutes);

// Meta / Taxonomie
app.use('/meta', taxonomyRoutes);
app.use('/api/meta', taxonomyRoutes);

// Feed + Suche
app.use('/feed', feedRoutes);
app.use('/api/feed', feedRoutes);
app.use('/feed', searchRoutes);
app.use('/api/feed', searchRoutes);

// Posts (erst spezialisierte Upload/Listings, dann generische)
app.use('/posts', uploadLimiter, postUploadRoutes); // /posts/upload, /posts/upload-binary, /posts/mine, /posts/by-user/:uid
app.use('/api/posts', uploadLimiter, postUploadRoutes);
app.use('/posts', postsRoutes);                     // generische Post-Routen (/:id etc.)
app.use('/api/posts', postsRoutes);

// Dateien (Signed URLs) – optional, aber praktisch
app.use('/files', mediaRoutes);
app.use('/api/files', mediaRoutes);

// Chat
app.use('/chat', chatRoutes);
app.use('/api/chat', chatRoutes);

// Admin (Dash/Jobs) + Seed (Testdaten) – Seed NUR in Dev benutzen!
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', seedRoutes);       // → POST /admin/seed/users  (Header: x-seed-secret)
app.use('/api/admin', seedRoutes);
app.use('/admin/dev', devSeedRoutes); // geschützt per x-admin-task Header
// Health
app.get('/healthz', (_req, res) => res.status(200).send('OK'));
app.get('/api/healthz', (_req, res) => res.status(200).send('OK'));

/* ---------- ERROR/404 IMMER GANZ ZUM SCHLUSS ---------- */
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.status || 500;
  const msg = err?.message || 'Internal error';
  console.error('API error:', status, msg);
  res.status(status).json({ error: 'internal', details: msg });
});
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ---- Export als HTTPS Function
export const api = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .region('europe-west3')
  .https.onRequest(app);

// ggf. weitere Exporte
export { indexPost } from './indexPost.js';

