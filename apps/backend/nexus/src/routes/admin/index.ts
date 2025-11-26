import { Router } from 'express';
import seed from './seed.routes.js';
import reindex from './reindex.routes.js';

const r = Router();
r.use(seed);
r.use(reindex);
export default r;