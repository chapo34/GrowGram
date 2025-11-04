// Express-Augmentation (Request.user, res.locals.requestId, etc.)
import type { UserDoc } from './domain';

declare global {
  namespace Express {
    interface Locals {
      requestId?: string;
      userId?: string;
    }

    interface Request {
      auth?: {
        uid: string;
        email?: string | null;
        claims?: Record<string, unknown>;
      };
      user?: UserDoc | null;
    }
  }
}

export {};