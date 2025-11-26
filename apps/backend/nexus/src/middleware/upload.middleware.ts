// src/middleware/upload.middleware.ts
import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';

const DEFAULT_LIMIT_MB = 10;
const DEFAULT_ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/octet-stream',
]);

function buildMulter(allowed: Set<string>, mbLimit: number) {
  const storage = multer.memoryStorage();
  return multer({
    storage,
    limits: { fileSize: mbLimit * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (allowed.has(file.mimetype)) return cb(null, true);
      const err = new MulterError('LIMIT_UNEXPECTED_FILE');
      (err as any).field = file.fieldname;
      // Fehlerpfad: NUR EIN Argument
      return cb(err as any);
    },
  });
}

function toHttp(err: unknown) {
  if (err instanceof MulterError) {
    const e: any = new Error(err.message);
    e.status = 400; e.code = 'upload_error';
    return e;
  }
  return err;
}

export function uploadSingle(field: string, opts?: { mbLimit?: number; allowed?: string[] }) {
  const m = buildMulter(new Set(opts?.allowed ?? Array.from(DEFAULT_ALLOWED)), opts?.mbLimit ?? DEFAULT_LIMIT_MB);
  const mw = m.single(field);
  return (req: Request, res: Response, next: NextFunction) => mw(req, res, (err) => next(toHttp(err)));
}

export function uploadArray(field: string, max = 5, opts?: { mbLimit?: number; allowed?: string[] }) {
  const m = buildMulter(new Set(opts?.allowed ?? Array.from(DEFAULT_ALLOWED)), opts?.mbLimit ?? DEFAULT_LIMIT_MB);
  const mw = m.array(field, max);
  return (req: Request, res: Response, next: NextFunction) => mw(req, res, (err) => next(toHttp(err)));
}

export function uploadAny(opts?: { mbLimit?: number; allowed?: string[] }) {
  const m = buildMulter(new Set(opts?.allowed ?? Array.from(DEFAULT_ALLOWED)), opts?.mbLimit ?? DEFAULT_LIMIT_MB);
  const mw = m.any();
  return (req: Request, res: Response, next: NextFunction) => mw(req, res, (err) => next(toHttp(err)));
}

// Named exports wie in deinen Routes
export const single = uploadSingle;
export const array  = uploadArray;
export const any    = uploadAny;

// Default-Objekt, damit import upload ... upload.single('file') funktioniert
const upload = { single, array, any };
export default upload;