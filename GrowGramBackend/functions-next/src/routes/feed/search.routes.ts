import { Router } from 'express';
// Wenn du später Controller nutzt, hier importieren.
const r = Router();

// GET /feed/search?q=...
r.get('/search', async (req, res) => {
  const q = String(req.query?.q ?? '');
  // const result = await ctrl.searchPosts({ q, limit: 20 });
  res.json({ q, posts: [], nextCursor: null });
});

export default r;