import { and, eq, sql } from 'drizzle-orm';
import { AppError } from '@chorify/core';
import { authAttempts, db } from '@chorify/db';

const WINDOW_MS = 60_000;
const MAX_FAILURES = 5;

function windowStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
}

/**
 * Postgres-backed login rate limiter (D66): 5 failures/min per
 * identifier+IP. Call `checkRateLimit` before handling, `recordFailure`
 * on uniform-error failure, `clearFailures` on success.
 */
export async function checkRateLimit(identifier: string, ip: string, now: Date = new Date()): Promise<void> {
  const start = windowStart(now);
  const rows = await db
    .select({ count: authAttempts.count })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.identifier, identifier),
        eq(authAttempts.ip, ip),
        eq(authAttempts.windowStart, start),
      ),
    )
    .limit(1);
  const count = rows[0]?.count ?? 0;
  if (count >= MAX_FAILURES) {
    const retryAfterSeconds = Math.max(1, Math.ceil((start.getTime() + WINDOW_MS - now.getTime()) / 1000));
    throw new AppError('RATE_LIMITED', 'Too many attempts — try again shortly', { retryAfterSeconds });
  }
}

export async function recordAuthFailure(identifier: string, ip: string, now: Date = new Date()): Promise<void> {
  const start = windowStart(now);
  const updated = await db
    .update(authAttempts)
    .set({ count: sql`${authAttempts.count} + 1` })
    .where(
      and(
        eq(authAttempts.identifier, identifier),
        eq(authAttempts.ip, ip),
        eq(authAttempts.windowStart, start),
      ),
    )
    .returning({ id: authAttempts.id });
  if (updated.length === 0) {
    await db.insert(authAttempts).values({ identifier, ip, windowStart: start, count: 1 });
  }
}

export async function clearAuthFailures(identifier: string, ip: string): Promise<void> {
  await db
    .delete(authAttempts)
    .where(and(eq(authAttempts.identifier, identifier), eq(authAttempts.ip, ip)));
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || 'unknown';
}
