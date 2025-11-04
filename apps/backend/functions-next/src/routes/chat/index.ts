import { Router } from 'express';
import open from './open.routes.js';
import messages from './messages.routes.js';
import media from './media.routes.js';
import read from './read.routes.js';

const r = Router();

r.use(open);
r.use(messages);
r.use(media);
r.use(read);

export default r;