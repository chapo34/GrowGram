import { Router } from 'express';
import health from './health.routes.js';
import legal from './legal.routes.js';

const r = Router();

r.use(health);
r.use('/legal', legal);

export default r;