import { Router } from 'express';
const r = Router();

r.get('/legal', (_req, res) => {
  res.json({
    imprint: { company: 'GrowGram', country: 'DE' },
    privacy: { version: '1.0.0' },
  });
});

export default r;