import { Router } from 'express';
import * as ctrl from '../../controllers/taxonomy/taxonomyController.js';

const r = Router();
r.get('/tags', ctrl.listTags);
export default r;