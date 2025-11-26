import { Router } from 'express';

const r = Router();

/** Public healthcheck */
r.get('/healthz', (_req, res) => res.type('text/plain').status(200).send('OK'));

/** Version & Meta */
r.get('/version', (_req, res) => {
  res.json({
    ok: true,
    name: 'growgram-backend',
    env: process.env.NODE_ENV || 'development',
    region: 'europe-west3',
    ts: new Date().toISOString(),
  });
});

export default r;