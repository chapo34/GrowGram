import { Router } from 'express';
import taxonomy from './taxonomy.routes.js';

const r = Router();
r.use(taxonomy);
export default r;