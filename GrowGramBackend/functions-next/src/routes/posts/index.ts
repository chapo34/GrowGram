import { Router } from 'express';
import uploadBinary from './upload-binary.routes.js';
import create from './create.routes.js';
import visibility from './visibility.routes.js';
import likes from './likes.routes.js';
import comments from './comments.routes.js';

const r = Router();

r.use(uploadBinary);
r.use(create);
r.use(visibility);
r.use(likes);
r.use(comments);

export default r;