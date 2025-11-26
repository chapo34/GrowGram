import { Router } from 'express';

import system from './system/index.js';
import auth from './auth/index.js';
import users from './users/index.js';
import posts from './posts/index.js';
import feed from './feed/index.js';
import media from './media/files.routes.js';
import chat from './chat/index.js';
import admin from './admin/index.js';
import taxonomy from './taxonomy/index.js';
import meta from './meta/index.js';
import waitlist from './waitlist/index.js';

/**
 * Haupt-Router (wird in app/routes.ts unter "/" UND "/api" gemounted).
 * Hier KEINE absolute Präfixe setzen – nur Feature-Namespaces.
 */
const router = Router();

router.use(system);     // /healthz, /version, /legal/*
router.use('/auth', auth);
router.use('/users', users);
router.use('/posts', posts);
router.use('/feed', feed);
router.use('/files', media); // GET /files/:path(*)
router.use('/chat', chat);
router.use('/admin', admin);
router.use('/taxonomy', taxonomy);
router.use('/meta', meta);
router.use('/waitlist', waitlist);

export default router;