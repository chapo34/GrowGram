import { Router } from 'express';
import taxonomyForward from './taxonomy.routes.js';

const r = Router();

/** Falls du Meta-spezifische Endpunkte hast, hier ergänzen.
 *  Als Platzhalter forwarden wir Taxonomy-Metadaten.
 */
r.use('/taxonomy', taxonomyForward);

export default r;