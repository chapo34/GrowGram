import { Router } from 'express';
import * as ctrl from '../../controllers/files/mediaController.js';

/**
 * GET /files/:path(*) → 302 Redirect auf signierte URL
 * Wichtig: :path mit ".*" aufnehmen, damit Slashes im Pfad funktionieren.
 */
const r = Router();

r.get('/:path(*)', ctrl.redirectSignedDownload);

export default r;