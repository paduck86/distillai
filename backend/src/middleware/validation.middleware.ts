import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './error.middleware.js';

export function validate<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(errors.join(', '));
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(errors.join(', '));
    }

    req.query = result.data;
    next();
  };
}

export function validateParams<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(errors.join(', '));
    }

    req.params = result.data;
    next();
  };
}
