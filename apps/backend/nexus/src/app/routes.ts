import type { Express, Router } from 'express';

/** Nimmt default export, `router` oder das Modul selbst als Router. */
function asRouter(m: any): Router {
  return (m?.default ?? m?.router ?? m) as Router;
}

/** Mountet alle Feature-Router unter API- und Non-API-Pfaden. */
export async function mountRoutes(app: Express) {
  // Auth
  const authMod = await import('../routes/auth/index.js');
  app.use('/auth', asRouter(authMod));
  app.use('/api/auth', asRouter(authMod));

  // Users
  const usersMod = await import('../routes/users/index.js');
  app.use('/users', asRouter(usersMod));
  app.use('/api/users', asRouter(usersMod));

  // Posts
  const postsMod = await import('../routes/posts/index.js');
  app.use('/posts', asRouter(postsMod));
  app.use('/api/posts', asRouter(postsMod));

  // Feed / Search
  const feedMod = await import('../routes/feed/index.js');
  app.use('/feed', asRouter(feedMod));
  app.use('/api/feed', asRouter(feedMod));

  // Media / Files
  const mediaMod = await import('../routes/media/files.routes.js');
  app.use('/files', asRouter(mediaMod));
  app.use('/api/files', asRouter(mediaMod));

  // Chat
  const chatMod = await import('../routes/chat/index.js');
  app.use('/chat', asRouter(chatMod));
  app.use('/api/chat', asRouter(chatMod));

  // Admin
  const adminMod = await import('../routes/admin/index.js');
  app.use('/admin', asRouter(adminMod));
  app.use('/api/admin', asRouter(adminMod));

  // Taxonomy / Meta
  const taxonomyMod = await import('../routes/taxonomy/index.js');
  app.use('/taxonomy', asRouter(taxonomyMod));
  app.use('/api/taxonomy', asRouter(taxonomyMod));

  const metaMod = await import('../routes/meta/index.js');
  app.use('/meta', asRouter(metaMod));
  app.use('/api/meta', asRouter(metaMod));

  // Waitlist
  const waitlistMod = await import('../routes/waitlist/index.js');
  app.use('/waitlist', asRouter(waitlistMod));
  app.use('/api/waitlist', asRouter(waitlistMod));

  // System (health/version)
  const systemMod = await import('../routes/system/index.js');
  app.use('/', asRouter(systemMod));
  app.use('/api', asRouter(systemMod));
}