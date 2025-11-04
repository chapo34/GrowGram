import { Router } from 'express';
import trending from './trending.routes.js';
import forYou from './for-you.routes.js';
import tags from './tags.routes.js';
import search from './search.routes.js';

const r = Router();

r.use(trending);
r.use(forYou);
r.use(tags);
r.use(search); // /feed/search

export default r;