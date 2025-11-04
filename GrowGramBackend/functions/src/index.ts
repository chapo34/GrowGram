// functions/src/index.ts
import dotenv from 'dotenv';
dotenv.config();

/* ------------------------------- Firebase -------------------------------- */
import * as functions from 'firebase-functions/v1';
import { initializeApp, getApps } from 'firebase-admin/app';
if (getApps().length === 0) initializeApp();

/* -------------------------------- Express -------------------------------- */
import express from 'express';
import type { CorsOptions, CorsOptionsDelegate } from 'cors';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

/* --------------------------------- Routes -------------------------------- */
import taxonomyRoutes from './routes/taxonomy.js';
import authRoutes from './routes/authRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import searchRoutes from './routes/search.js';

// Upload-Controller (multer-basiert)
import { postUpload } from './controllers/PostUploadController.js';

import avatarRoutes from './routes/avatarRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import seedRoutes from './routes/seedRoutes.js';
import devSeedRoutes from './routes/devSeedRoutes.js';
import { verifyEmailController as verifyEmail } from './controllers/verifyController.js';

// Compliance
import { complianceAck } from './controllers/complianceController.js';
import authMiddleware from './middleware/authMiddleware.js';

// Waitlist
import waitlistRoutes from './routes/waitlist.js';

// Dev-Link-Helper (optional)
export { genVerify } from './devLinks.js';

/* ----------------------------- Pfade/Helpers ----------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* --------------------------- CORS & Sicherheit --------------------------- */
const cfg: any = (functions as any).config?.() ?? {};
const PROD_ORIGIN: string = cfg?.app?.baseurl || process.env.APP_BASEURL || '';

const ORIGINS: string[] = [
  'http://localhost:19006', 'http://127.0.0.1:19006',
  'http://localhost:19000', 'http://127.0.0.1:19000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  PROD_ORIGIN,
  'https://growgram-backend.web.app',
  'https://growgram-backend.firebaseapp.com',
  'https://growgram-app.com',
  'https://www.growgram-app.com',
].filter(Boolean);

const allowedOrigins = new Set(ORIGINS);

const corsOptions: CorsOptions | CorsOptionsDelegate = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // z. B. curl/healthz
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  exposedHeaders: ['Location'],
};

/* --------------------------------- App ----------------------------------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// Security / Perf
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use(compression());
app.use(cors(corsOptions));

// Robuste Preflight-Antwort
app.options('*', (req, res) => {
  const origin = req.get('Origin') || '';
  res.setHeader('Vary','Origin');
  if (!origin || allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age','600');
    return res.status(204).end();
  }
  return res.status(403).end();
});

// Parser + Static
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------------------- Rate Limiting ------------------------------ */
const keyFromReq = (req: express.Request) =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
  req.ip || req.socket?.remoteAddress || 'anon';

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromReq,
}));

// Engeres Limit für /waitlist
const waitlistLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromReq,
});

/* --------------------------------- Routen -------------------------------- */
// Auth / Verify
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.get('/auth/verify-email', verifyEmail);
app.get('/api/auth/verify-email', verifyEmail);

// ✅ Compliance-Acknowledgement (schützt mit authMiddleware)
app.post('/auth/compliance-ack', authMiddleware, complianceAck);
app.post('/api/auth/compliance-ack', authMiddleware, complianceAck);

// Avatare / Profile
app.use('/auth', avatarRoutes);
app.use('/api/auth', avatarRoutes);
app.use('/users', profileRoutes);
app.use('/api/users', profileRoutes);

// Meta / Feed / Suche
app.use('/meta', taxonomyRoutes);
app.use('/api/meta', taxonomyRoutes);
app.use('/feed', feedRoutes);
app.use('/api/feed', feedRoutes);
app.use('/feed', searchRoutes);
app.use('/api/feed', searchRoutes);

// Uploads (Multer-Controller)
// Alias für ältere/mobile Clients, die /upload-binary nutzen
app.post('/posts/upload', postUpload);
app.post('/posts/upload-binary', postUpload);
app.post('/api/posts/upload', postUpload);
app.post('/api/posts/upload-binary', postUpload);

// Posts CRUD
app.use('/posts', postsRoutes);
app.use('/api/posts', postsRoutes);

// Dateien / Medien
app.use('/files', mediaRoutes);
app.use('/api/files', mediaRoutes);

// Chat
app.use('/chat', chatRoutes);
app.use('/api/chat', chatRoutes);

// Admin / Seeds
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', seedRoutes);
app.use('/api/admin', seedRoutes);
app.use('/admin/dev', devSeedRoutes);

// Waitlist (drosseln)
app.use('/waitlist', waitlistLimiter, waitlistRoutes);
app.use('/api/waitlist', waitlistLimiter, waitlistRoutes);

/* ------------------------------ Legal/Health ----------------------------- */
app.get(['/legal/terms','/api/legal/terms'], (_req, res) =>
  res.type('text/plain').send('GrowGram Terms: Community- & Content-Plattform. Kein Handel / keine Vermittlung.')
);
app.get(['/legal/guidelines','/api/legal/guidelines'], (_req, res) =>
  res.type('text/plain').send('Community-Richtlinien: Kein Kauf/Verkauf/Tausch/Lieferung. Keine persönlichen Daten teilen.')
);
app.get(['/legal/privacy','/api/legal/privacy'], (_req, res) =>
  res.type('text/plain').send('Privacy: Minimale Datenverarbeitung. Details in der App/Website.')
);

app.get(['/healthz','/api/healthz'], (_req, res) => res.status(200).send('OK'));
app.get(['/version','/api/version'], (_req, res) =>
  res.json({ ok:true, name:'growgram-backend', env:process.env.NODE_ENV || 'development', region:'europe-west3', ts:new Date().toISOString() })
);

/* ------------------------------- Fehler/404 ------------------------------- */
import type { Request, Response, NextFunction } from 'express';
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.message === 'CORS: origin not allowed') {
    return res.status(403).json({ error: 'forbidden', reason: 'origin_not_allowed' });
  }
  console.error('API error:', err?.message || err);
  return res.status(500).json({ error: 'internal', details: 'unexpected_error' });
});

app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Not found' }));

/* ----------------------------- Cloud Function ---------------------------- */
export const api = functions
  .region('europe-west3')
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onRequest(app);

/* -------------------------- Weitere Export-Funktionen --------------------- */
// Falls verwendet – ansonsten entfernen.
export { indexPost } from './indexPost.js';
export { reindexPosts } from './jobs/reindex.js';