import { Router } from 'express';
import waitlist from './waitlist.routes.js';

const r = Router();
r.use(waitlist);
export default r;