import { Router } from 'express';
import trending from '../trending';
import forYou from './for-you.';
import tags from './tags.routes';
import search from './search.routes.js';

const r = Router();

r.use(trending);
r.use(forYou);
r.use(tags);
r.use(search); // /feed/search

export default r;