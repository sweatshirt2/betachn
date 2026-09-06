import { join } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/** Loads the repo-root .env (gitignored); no-op when the file is absent. */
export function loadRepoEnv(): void {
  // import.meta.dirname exists under tsx/node but NOT in the Next.js bundle —
  // fall back to cwd-relative resolution there (web cwd = apps/web).
  const metaDir = (import.meta as unknown as { dirname?: string }).dirname;
  const repoRoot = metaDir ? join(metaDir, '../../..') : join(process.cwd(), '../..');
  loadDotenv({ path: join(repoRoot, '.env') });
}

loadRepoEnv();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a PostgreSQL connection string'),
});

export type DbEnv = z.infer<typeof envSchema>;

/** Parses and validates the environment at boot; throws (fail-fast) when invalid. */
export function readDbEnv(env: NodeJS.ProcessEnv = process.env): DbEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment variables — ${detail}. See .env.example.`);
  }
  return parsed.data;
}

/** Validated once at module load: importing the db client fails fast on a bad environment. */
export const dbEnv = readDbEnv();
