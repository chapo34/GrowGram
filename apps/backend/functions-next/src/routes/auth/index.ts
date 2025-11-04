import { Router } from 'express';
import register from './register.routes.js';
import login from './login.routes.js';
import verify from './verify.routes.js';
import compliance from './compliance.routes.js';
import me from './me.routes.js';

const r = Router();

r.use(register);
r.use(login);
r.use(verify);
r.use(compliance);
r.use(me); // /auth/me + Aliasse

export default r;