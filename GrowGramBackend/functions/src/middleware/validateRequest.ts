// functions/src/middleware/validateRequest.ts
import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/** Nutzt express-validator: beim Fehler 400 mit Details, sonst `next()`. */
export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
}

export default validateRequest;