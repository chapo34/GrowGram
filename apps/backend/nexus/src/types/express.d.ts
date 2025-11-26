// src/types/express.d.ts
import type { UserDoc } from '../models/userModel.js'; // Pfad ggf. anpassen

declare global {
  namespace Express {
    interface Locals {
      requestId?: string;
      userId?: string;
    }

    /** JWT-Identität (leichtgewichtig) */
    interface AuthUser {
      id?: string;
      userId?: string;
      sub?: string;
      email?: string;
      role?: 'user' | 'admin' | (string & {});
    }

    interface Request {
      /** Rohdaten aus z.B. Firebase Auth (optional) */
      auth?: {
        uid: string;
        email?: string | null;
        claims?: Record<string, unknown>;
      };

      /** Identität aus unserem JWT (von auth middleware gesetzt) */
      authUser?: AuthUser;

      /** Voller, hydratisierter Datensatz aus Firestore (optional) */
      user?: UserDoc | null;
    }
  }
}

export {};