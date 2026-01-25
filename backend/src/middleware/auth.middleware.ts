import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { UnauthorizedError } from './error.middleware.js';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Optional auth - doesn't throw if no token
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (user) {
      req.user = user;
    }

    next();
  } catch {
    // Ignore errors, just continue without user
    next();
  }
}
