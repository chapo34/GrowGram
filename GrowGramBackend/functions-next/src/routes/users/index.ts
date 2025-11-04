import { Router } from 'express';
import profile from './profile.routes.js';
import avatar from './avatar.routes.js';

const r = Router();
r.use(profile);
r.use(avatar);
export default r;