import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { WorkerEnv } from './env';

/** Constant-time comparison of two ASCII secrets of differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Bearer-token gate for /admin/*; rejects without a valid WORKER_ADMIN_TOKEN. */
export function requireAdminToken(
  env: WorkerEnv,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (token.length === 0 || !safeEqual(token, env.WORKER_ADMIN_TOKEN)) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Missing or invalid admin token' },
      });
      return;
    }
    next();
  };
}
