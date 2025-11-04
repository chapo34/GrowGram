import { Router } from 'express';
import * as ctrl from '../../controllers/taxonomy/taxonomyController.js';

/** Beispiel: GET /taxonomy/strains, /taxonomy/tags ... */
const r = Router();

r.get('/strains', ctrl.listStrains);
r.get('/tags', ctrl.listTags);

export default r;