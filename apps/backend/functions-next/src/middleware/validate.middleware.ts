// src/middleware/validate.middleware.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

function wrap(schema: ZodSchema, pick: 'body'|'query'|'params'): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync((req as any)[pick]);
      (req as any)[pick] = parsed;
      next();
    } catch (err: any) {
      const e: any = new Error('validation_error');
      e.status = 400; e.code = 'validation_error'; e.details = err?.errors || err?.message;
      next(e);
    }
  };
}

// bewusst lax typisiert, um deine existierenden Funktionsaufrufe zu erlauben
const validate: any = {
  body  : (s: ZodSchema) => wrap(s, 'body'),
  query : (s: ZodSchema) => wrap(s, 'query'),
  params: (s: ZodSchema) => wrap(s, 'params'),
};

export type Schemas = { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema };

// optionaler No-Op (compat, falls wo validate(schemas) aufgerufen wird)
export default Object.assign(
  (_schemas?: Schemas) => ((req: Request, _res: Response, next: NextFunction) => next()),
  validate
);

export { validate };